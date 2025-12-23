-- Create storage bucket for barber photos
INSERT INTO storage.buckets (id, name, public) VALUES ('barber-photos', 'barber-photos', true);

-- RLS Policies for barber-photos bucket
CREATE POLICY "Anyone can view barber photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'barber-photos');

CREATE POLICY "Staff can upload barber photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'barber-photos' AND is_staff(auth.uid()));

CREATE POLICY "Owners can update barber photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'barber-photos' AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete barber photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'barber-photos' AND has_role(auth.uid(), 'owner'::app_role));