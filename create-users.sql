-- Run this SQL in Supabase SQL Editor to create admin and member users
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Create admin user
INSERT INTO users (id, email, name, password, role, "ageVerified", "ageVerifiedAt", "createdAt", "updatedAt")
VALUES (
  'admin-' || replace(gen_random_uuid()::text, '-', ''),
  'admin@profitplay.com',
  'Admin User',
  '$2a$10$aMvcjQ0EGXIU1UxjJmnti.zmUmClUzHYmJGtoSTAGof7YTtt4huNe', -- bcrypt hash of 'admin123'
  'ADMIN',
  true,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  "updatedAt" = NOW();

-- Create member user  
INSERT INTO users (id, email, name, password, role, "ageVerified", "ageVerifiedAt", "createdAt", "updatedAt")
VALUES (
  'member-' || replace(gen_random_uuid()::text, '-', ''),
  'member@profitplay.com',
  'Test Member',
  '$2a$10$7AhPd0Cdrj0Vp6uL69xrt.Iz/Yi9X0SjcwxIrBr//w9WPCTetEze2', -- bcrypt hash of 'member123'
  'MEMBER',
  true,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  "updatedAt" = NOW();

