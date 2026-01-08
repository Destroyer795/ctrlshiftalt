-- PhantomPay - RECIPIENT LOOKUP
-- Run this in Supabase SQL Editor

-- Secure function to look up a user ID by email
-- Only returns ID if the user exists, otherwise returns NULL
-- This prevents exposing the entire user list while allowing P2P transfers

CREATE OR REPLACE FUNCTION get_recipient_id(email_input TEXT)
RETURNS UUID AS $$
DECLARE
  found_id UUID;
BEGIN
  SELECT id INTO found_id
  FROM auth.users
  WHERE email = email_input;
  
  RETURN found_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
