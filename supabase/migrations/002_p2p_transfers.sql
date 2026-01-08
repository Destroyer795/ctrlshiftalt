-- PhantomPay - P2P TRANSFER UPDATE
-- Run this in Supabase SQL Editor AFTER the initial schema

-- First, add recipient_id column to transactions (for P2P transfers)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES profiles(id);

-- Create index for recipient lookups
CREATE INDEX IF NOT EXISTS idx_transactions_recipient_id ON transactions(recipient_id);

-- Update RLS policy to allow users to see transactions where they are the recipient
DROP POLICY IF EXISTS "Users can view received transactions" ON transactions;
CREATE POLICY "Users can view received transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = recipient_id);

-- DROP and recreate the process_offline_batch function with P2P support
CREATE OR REPLACE FUNCTION process_offline_batch(payload JSONB)
RETURNS JSONB AS $$
DECLARE
  tx JSONB;
  processed_ids TEXT[] := ARRAY[]::TEXT[];
  failed_ids JSONB[] := ARRAY[]::JSONB[];
  current_balance NUMERIC;
  user_uuid UUID;
  new_balance NUMERIC;
  tx_amount NUMERIC;
  tx_type TEXT;
  tx_offline_id TEXT;
  tx_signature TEXT;
  tx_description TEXT;
  tx_timestamp BIGINT;
  tx_recipient_id UUID;
  existing_count INTEGER;
  recipient_exists BOOLEAN;
BEGIN
  -- Get the authenticated user (sender)
  user_uuid := auth.uid();
  
  IF user_uuid IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Not authenticated',
      'processed_ids', processed_ids,
      'failed_ids', failed_ids,
      'new_balance', 0
    );
  END IF;

  -- Get current balance
  SELECT balance INTO current_balance
  FROM profiles
  WHERE id = user_uuid;

  IF current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Profile not found',
      'processed_ids', processed_ids,
      'failed_ids', failed_ids,
      'new_balance', 0
    );
  END IF;

  new_balance := current_balance;

  -- Process each transaction in the batch
  FOR tx IN SELECT * FROM jsonb_array_elements(payload->'transactions')
  LOOP
    tx_offline_id := tx->>'offline_id';
    tx_amount := (tx->>'amount')::NUMERIC;
    tx_type := tx->>'type';
    tx_signature := tx->>'signature';
    tx_description := COALESCE(tx->>'description', '');
    tx_timestamp := (tx->>'timestamp')::BIGINT;
    
    -- Get recipient_id if present (for P2P transfers)
    tx_recipient_id := NULL;
    IF tx->>'recipient_id' IS NOT NULL AND tx->>'recipient_id' != '' THEN
      tx_recipient_id := (tx->>'recipient_id')::UUID;
    END IF;

    -- IDEMPOTENCY CHECK: Skip if offline_id already exists
    SELECT COUNT(*) INTO existing_count
    FROM transactions
    WHERE offline_id = tx_offline_id;

    IF existing_count > 0 THEN
      -- Already processed, skip but report as success
      processed_ids := array_append(processed_ids, tx_offline_id);
      CONTINUE;
    END IF;

    -- SIGNATURE VERIFICATION
    IF tx_signature IS NULL OR tx_signature = '' THEN
      failed_ids := array_append(failed_ids, jsonb_build_object(
        'offline_id', tx_offline_id,
        'reason', 'Missing signature'
      ));
      CONTINUE;
    END IF;

    -- BALANCE CHECK for debits
    IF tx_type = 'debit' THEN
      IF new_balance < tx_amount THEN
        failed_ids := array_append(failed_ids, jsonb_build_object(
          'offline_id', tx_offline_id,
          'reason', 'Insufficient balance'
        ));
        CONTINUE;
      END IF;
      
      -- Deduct from sender
      new_balance := new_balance - tx_amount;
      
      -- P2P TRANSFER: Credit the recipient if specified
      IF tx_recipient_id IS NOT NULL AND tx_recipient_id != user_uuid THEN
        -- Check recipient exists
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id = tx_recipient_id) INTO recipient_exists;
        
        IF recipient_exists THEN
          -- Credit recipient's balance
          UPDATE profiles
          SET balance = balance + tx_amount, last_synced_at = NOW()
          WHERE id = tx_recipient_id;
          
          -- Create credit transaction for recipient
          INSERT INTO transactions (user_id, amount, type, description, status, offline_id, signature, recipient_id)
          VALUES (tx_recipient_id, tx_amount, 'credit', 'Received: ' || tx_description, 'synced', 
                  tx_offline_id || '-rcv', tx_signature, user_uuid);
        END IF;
      END IF;
    ELSE
      -- Credit (for self-deposits, not P2P)
      new_balance := new_balance + tx_amount;
    END IF;

    -- INSERT SENDER'S TRANSACTION
    INSERT INTO transactions (user_id, amount, type, description, status, offline_id, signature, recipient_id)
    VALUES (user_uuid, tx_amount, tx_type, tx_description, 'synced', tx_offline_id, tx_signature, tx_recipient_id);

    processed_ids := array_append(processed_ids, tx_offline_id);
  END LOOP;

  -- UPDATE SENDER'S BALANCE
  UPDATE profiles
  SET balance = new_balance, last_synced_at = NOW()
  WHERE id = user_uuid;

  RETURN jsonb_build_object(
    'processed_ids', processed_ids,
    'failed_ids', to_jsonb(failed_ids),
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
