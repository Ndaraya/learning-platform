-- Migration: add Stripe subscription fields to profiles
-- Run in Supabase SQL Editor after schema.sql

alter table profiles
  add column if not exists stripe_customer_id  text,
  add column if not exists subscription_tier   subscription_tier not null default 'free',
  add column if not exists subscription_status text,                 -- active | canceled | past_due | trialing
  add column if not exists subscription_id     text;                 -- Stripe subscription ID

create index if not exists on profiles (stripe_customer_id);
