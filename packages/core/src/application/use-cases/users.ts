import { ConflictError } from '../../domain';
import { registerSchema } from '../../schemas';
import type { IdGenerator, PasswordHasher, UserRepository } from '../ports';
import type { NewUser, User } from '../types';
import { parseOrThrow } from '../parseOrThrow';

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly ids: IdGenerator
  ) {}
  async execute(input: unknown): Promise<User> {
    const data = parseOrThrow<{ name: string; email: string; password: string }>(
      registerSchema,
      input
    );
    const email = data.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) throw new ConflictError('E-mail');
    const newUser: NewUser = {
      id: this.ids.next(),
      name: data.name.trim(),
      email,
      passwordHash: await this.passwords.hash(data.password),
    };
    const created = await this.users.create(newUser);
    if (!created) throw new ConflictError('E-mail');
    return created;
  }
}

export class AuthenticateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher
  ) {}
  async execute(email: string, password: string): Promise<User | null> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user || !(await this.passwords.verify(password, user.passwordHash))) return null;
    return user;
  }
}
