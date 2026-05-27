-- Migration: Add GPS Geofencing columns to attendance table
ALTER TABLE public.attendance 
  ADD COLUMN latitude_in numeric(9,6),
  ADD COLUMN longitude_in numeric(9,6),
  ADD COLUMN latitude_out numeric(9,6),
  ADD COLUMN longitude_out numeric(9,6),
  ADD COLUMN geofence_verified_in boolean DEFAULT false,
  ADD COLUMN geofence_verified_out boolean DEFAULT false;
