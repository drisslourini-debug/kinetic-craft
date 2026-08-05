DO $$
DECLARE
  v_atelier_tenant_id UUID;
  v_user_id UUID;
BEGIN
  -- 1. Finde den Atelier 77 Tenant
  SELECT id INTO v_atelier_tenant_id FROM tenants WHERE name = 'Atelier 77' LIMIT 1;
  
  -- 2. Prüfe ob Leandro schon existiert, ansonsten neu anlegen
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'leandro@atelier77.ch' LIMIT 1;
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', 'leandro@atelier77.ch',
      crypt('Test1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, v_user_id::text, format('{"sub":"%s","email":"%s"}', v_user_id::text, 'leandro@atelier77.ch')::jsonb, 'email', now(), now(), now());
  END IF;

  -- 3. Weist Leandro dem Atelier 77 Tenant zu
  INSERT INTO user_roles (id, tenant_id, role, user_name)
  VALUES (v_user_id, v_atelier_tenant_id, 'admin', 'Leandro Lüthi')
  ON CONFLICT (id) DO UPDATE SET tenant_id = v_atelier_tenant_id, role = 'admin';
  
END $$;
