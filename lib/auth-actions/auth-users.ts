import { prisma } from "@/lib/prisma";


export const getUserByUsername = async (username: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { username } });

    return user;
  } catch {
    return null;
  }
};

export const getUserById = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
            include: {
        role: true, // Include the related role
      }
    });
    
    return user;
  } catch {
    return null;
  }
};

export const getEmailByUserId = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true },
  });

  if (!user) {
    throw new Error('User not found!');
  }

  return [user.name];
};

export const getEmailByUserIdUpload = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  if (!user) {
    throw new Error('User not found!');
  }

  return user.username;
};

export const getEmailByApproverId = async (approverId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: approverId },
    select: { username: true, name: true },
  });

  if (!user) {
    throw new Error('User not found!');
  }

  return user.username;
};