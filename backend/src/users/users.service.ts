import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  /**
   * Search registered users by email or name. Used by the sharing UI to find
   * people to add to a board. Only safe fields are returned.
   */
  async search(query: string, excludeId: string) {
    const q = query.trim();
    if (!q) return [];

    return this.prisma.user.findMany({
      where: {
        id: { not: excludeId },
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true },
      take: 10,
    });
  }
}