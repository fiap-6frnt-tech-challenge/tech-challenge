import { AuthenticationError } from '../../domain';
import type { IdGenerator, UserRepository } from '../ports';
import type { User } from '../types';

/** The authentication adapter must verify the provider's email before calling this use case. */
export class ResolveOAuthUser {
  constructor(
    private readonly users: UserRepository,
    private readonly ids: IdGenerator
  ) {}
  async execute(profile: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  }): Promise<User> {
    if (!profile.email) throw new AuthenticationError();
    const email = profile.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      // A local signup does not verify email ownership. Linking its password to a
      // verified Google identity would preserve a potential attacker's credential.
      if (existing.passwordHash) throw new AuthenticationError();
      return existing;
    }
    const created = await this.users.create({
      id: this.ids.next(),
      name: profile.name || email,
      email,
      passwordHash: '',
      ...(profile.image ? { image: profile.image } : {}),
    });
    const user = created ?? (await this.users.findByEmail(email));
    if (!user || user.passwordHash) throw new AuthenticationError();
    return user;
  }
}
