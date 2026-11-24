import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  notifications,
  subscriptions,
  userPreferences,
  users,
} from './schema.ts';

export type DbUser = typeof users.$inferSelect;
export type DbUserPreferences = typeof userPreferences.$inferSelect;
export type DbSubscription = typeof subscriptions.$inferSelect;

export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  displayName?: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
}): Promise<DbUser> {
  try {
    const defaultName =
      params.displayName?.trim() ||
      params.email.split('@')[0] ||
      'NISWARO User';

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, params.uid))
      .limit(1);

    let user: DbUser;

    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({
          email: params.email,
          emailVerified: params.emailVerified ?? existing[0].emailVerified,
          avatarUrl: params.avatarUrl ?? existing[0].avatarUrl,
          displayName: existing[0].displayName || defaultName,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, params.uid))
        .returning();
      user = updated[0];
    } else {
      const inserted = await db
        .insert(users)
        .values({
          uid: params.uid,
          email: params.email,
          displayName: defaultName,
          avatarUrl: params.avatarUrl ?? null,
          emailVerified: params.emailVerified ?? false,
          onboardingCompleted: false,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email: params.email,
            emailVerified: params.emailVerified ?? false,
            updatedAt: new Date(),
          },
        })
        .returning();
      user = inserted[0];
    }

    // Ensure preferences row exists
    await db
      .insert(userPreferences)
      .values({ userId: user.id })
      .onConflictDoNothing({ target: userPreferences.userId });

    // Ensure subscription row exists
    await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        plan: 'free',
        status: 'active',
        monthlyTokenLimit: 250000,
      })
      .onConflictDoNothing({ target: subscriptions.userId });

    return user;
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function getUserProfileBundle(userId: number) {
  try {
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [prefsRow] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const [subRow] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    return {
      user: userRow ?? null,
      preferences: prefsRow ?? null,
      subscription: subRow ?? null,
    };
  } catch (error) {
    console.error('Database error in getUserProfileBundle:', error);
    throw new Error('Failed to load user profile.', { cause: error });
  }
}

export async function completeUserOnboarding(
  userId: number,
  input: {
    displayName: string;
    interests: string[];
    preferredLanguage: string;
    experienceLevel: string;
    primaryUseCases: string[];
    theme: 'dark' | 'light';
    defaultAiModel: string;
  }
) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        displayName: input.displayName.trim(),
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    const [updatedPrefs] = await db
      .insert(userPreferences)
      .values({
        userId,
        interests: input.interests,
        preferredLanguage: input.preferredLanguage,
        experienceLevel: input.experienceLevel,
        primaryUseCases: input.primaryUseCases,
        theme: input.theme,
        defaultAiModel: input.defaultAiModel,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          interests: input.interests,
          preferredLanguage: input.preferredLanguage,
          experienceLevel: input.experienceLevel,
          primaryUseCases: input.primaryUseCases,
          theme: input.theme,
          defaultAiModel: input.defaultAiModel,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Seed an initial welcome notification so the inbox is genuinely live
    await db.insert(notifications).values({
      userId,
      title: 'Welcome to NISWARO AI',
      body: `Your workspace is configured for ${input.primaryUseCases.slice(0, 2).join(' & ') || 'AI productivity'}. Start by creating a project or asking AI Brain.`,
      category: 'system',
      actionModule: 'ai_brain',
    });

    return { user: updatedUser, preferences: updatedPrefs };
  } catch (error) {
    console.error('Database error in completeUserOnboarding:', error);
    throw new Error('Failed to save onboarding preferences.', { cause: error });
  }
}

export async function updateUserSettings(
  userId: number,
  input: {
    displayName?: string;
    preferredLanguage?: string;
    experienceLevel?: string;
    interests?: string[];
    primaryUseCases?: string[];
    theme?: 'dark' | 'light';
    defaultAiModel?: string;
    memoryEnabled?: boolean;
    notificationsEnabled?: boolean;
  }
) {
  try {
    if (input.displayName !== undefined) {
      await db
        .update(users)
        .set({
          displayName: input.displayName.trim(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    const prefUpdate: Partial<typeof userPreferences.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.preferredLanguage !== undefined)
      prefUpdate.preferredLanguage = input.preferredLanguage;
    if (input.experienceLevel !== undefined)
      prefUpdate.experienceLevel = input.experienceLevel;
    if (input.interests !== undefined) prefUpdate.interests = input.interests;
    if (input.primaryUseCases !== undefined)
      prefUpdate.primaryUseCases = input.primaryUseCases;
    if (input.theme !== undefined) prefUpdate.theme = input.theme;
    if (input.defaultAiModel !== undefined)
      prefUpdate.defaultAiModel = input.defaultAiModel;
    if (input.memoryEnabled !== undefined)
      prefUpdate.memoryEnabled = input.memoryEnabled;
    if (input.notificationsEnabled !== undefined)
      prefUpdate.notificationsEnabled = input.notificationsEnabled;

    await db
      .update(userPreferences)
      .set(prefUpdate)
      .where(eq(userPreferences.userId, userId));

    return await getUserProfileBundle(userId);
  } catch (error) {
    console.error('Database error in updateUserSettings:', error);
    throw new Error('Failed to update settings.', { cause: error });
  }
}

export async function deleteUserAccountData(userId: number) {
  try {
    await db.delete(users).where(eq(users.id, userId));
  } catch (error) {
    console.error('Database error in deleteUserAccountData:', error);
    throw new Error('Failed to delete account data.', { cause: error });
  }
}
