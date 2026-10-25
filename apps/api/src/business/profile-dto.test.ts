import { describe, expect, it } from 'vitest';
import { profileInputSchema, profileQuerySchema } from './profile-dto.js';

const profile = { first_name: '  Anne Marie ', last_name: ' Dupont ', avatar_url: null, phone_number: '+33612345678', job_title: ' Architecte ', department: null };
describe('profil : frontière DTO', () => {
  it('normalise les noms et le poste sans inventer de nom', () => {
    expect(profileInputSchema.parse(profile)).toEqual({ ...profile, first_name: 'Anne Marie', last_name: 'Dupont', job_title: 'Architecte' });
  });
  it('refuse les valeurs non fiables et les propriétés réservées', () => {
    for (const change of [{ first_name: ' ' }, { last_name: null }, { last_name: 'x'.repeat(101) }, { phone_number: '0612345678' }, { phone_number: '+0123456789' }, { avatar_url: 'javascript:alert(1)' }, { avatar_url: 'https://' }, { job_title: 'x'.repeat(121) }, { department: 'x'.repeat(101) }, { role: 'super_admin' }, { is_email_verified: true }]) {
      expect(profileInputSchema.safeParse({ ...profile, ...change }).success).toBe(false);
    }
    expect(profileInputSchema.parse({ first_name: 'Anne', last_name: 'Dupont' })).toEqual({ first_name: 'Anne', last_name: 'Dupont', avatar_url: null, phone_number: null, job_title: null, department: null });
    expect(profileInputSchema.safeParse({ first_name: 'Anne' }).success).toBe(false);
    expect(profileInputSchema.safeParse({ last_name: 'Dupont' }).success).toBe(false);
    expect(profileQuerySchema.safeParse({ tenantId: 'invalid' }).success).toBe(false);
    expect(profileQuerySchema.safeParse({ actorId: 'other' }).success).toBe(false);
  });
});

