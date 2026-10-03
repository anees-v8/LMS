-- ============================================================
-- Migration: Add Razorpay Credentials to Tenants
-- Allows each institute to collect fees directly into their
-- own Razorpay bank account.
-- ============================================================

ALTER TABLE tenants
ADD COLUMN razorpay_key_id VARCHAR(100) NULL,
ADD COLUMN razorpay_secret VARCHAR(100) NULL;
