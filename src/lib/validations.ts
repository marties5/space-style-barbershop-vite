import { z } from 'zod';

// Barber validation schema
export const barberSchema = z.object({
  name: z.string().trim().min(1, 'Nama harus diisi').max(100, 'Nama maksimal 100 karakter'),
  photo_url: z.string().url('URL tidak valid').optional().or(z.literal('')),
  specialization: z.string().max(100, 'Spesialisasi maksimal 100 karakter').optional().or(z.literal('')),
  commission_service: z.number().min(0, 'Komisi minimal 0%').max(100, 'Komisi maksimal 100%'),
  commission_product: z.number().min(0, 'Komisi minimal 0%').max(100, 'Komisi maksimal 100%'),
});

export type BarberFormData = z.infer<typeof barberSchema>;

// Product validation schema
export const productSchema = z.object({
  name: z.string().trim().min(1, 'Nama produk harus diisi').max(200, 'Nama maksimal 200 karakter'),
  price: z.number().min(0, 'Harga tidak boleh negatif').max(999999999, 'Harga terlalu besar'),
  cost_price: z.number().min(0, 'HPP tidak boleh negatif').max(999999999, 'HPP terlalu besar'),
  stock: z.number().int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif'),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Service validation schema
export const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Nama layanan harus diisi').max(200, 'Nama maksimal 200 karakter'),
  price: z.number().min(0, 'Harga tidak boleh negatif').max(999999999, 'Harga terlalu besar'),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

// Auth validation schema
export const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid').max(255, 'Email terlalu panjang'),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100, 'Password terlalu panjang'),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Nama harus diisi').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().trim().email('Format email tidak valid').max(255, 'Email terlalu panjang'),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100, 'Password terlalu panjang'),
  role: z.enum(['owner', 'kasir'], { errorMap: () => ({ message: 'Role tidak valid' }) }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

// Validation result types
type ValidationSuccess<T> = { success: true; data: T };
type ValidationError = { success: false; error: string };
type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

// Validation helper function
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.errors[0];
  return { success: false, error: firstError.message };
}
