export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

const PLATFORM_PREFIX = 'gmail_property_decisions';

type DecisionsConfig = {
	aliases: Record<string, string>;
	rejectedLabels: string[];
	updatedAt: string;
};

function platformKey(userId: string): string {
	return `${PLATFORM_PREFIX}:${userId}`;
}

function normalizeLabel(raw: string): string {
	return raw
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

function sanitizeAliases(input: unknown): Record<string, string> {
	if (!input || typeof input !== 'object') return {};
	const entries = Object.entries(input as Record<string, unknown>);
	const next: Record<string, string> = {};
	for (const [rawKey, rawValue] of entries) {
		if (typeof rawKey !== 'string' || typeof rawValue !== 'string') continue;
		const key = normalizeLabel(rawKey);
		const value = rawValue.trim();
		if (!key || !value) continue;
		next[key] = value;
	}
	return next;
}

function sanitizeRejectedLabels(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	return Array.from(
		new Set(
			input
				.filter((entry): entry is string => typeof entry === 'string')
				.map((entry) => normalizeLabel(entry))
				.filter(Boolean)
		)
	);
}

function parseConfig(raw: unknown): DecisionsConfig {
	const payload = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	return {
		aliases: sanitizeAliases(payload.aliases),
		rejectedLabels: sanitizeRejectedLabels(payload.rejectedLabels),
		updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
	};
}

/**
 * GET /api/gmail/property-decisions
 * Récupère les décisions manuelles de rattachement/refus des libellés logements détectés.
 */
export async function GET(request: Request) {
	const rateLimitResult = await rateLimit(request, 'relaxed');
	if (rateLimitResult) return rateLimitResult;

	const authResult = await requireAuth(request);
	if (authResult instanceof NextResponse) return authResult;

	try {
			const userId = `${authResult.user.id || ''}`.trim();
			if (!userId) {
				return NextResponse.json({ success: false, error: 'Missing user id' }, { status: 401 });
			}

			const key = platformKey(userId);
		const setting = await prisma.integrationSetting.findUnique({ where: { platform: key } });

		return NextResponse.json({
			success: true,
			decisions: parseConfig(setting?.config),
		});
	} catch (error) {
		console.error('GET /api/gmail/property-decisions error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch property decisions',
			},
			{ status: 500 }
		);
	}
}

/**
 * PUT /api/gmail/property-decisions
 * Sauvegarde les choix manuels (alias validés + libellés refusés) en base.
 */
export async function PUT(request: Request) {
	const rateLimitResult = await rateLimit(request, 'strict');
	if (rateLimitResult) return rateLimitResult;

	const authResult = await requireAuth(request);
	if (authResult instanceof NextResponse) return authResult;

	try {
		const body = (await request.json()) as {
			aliases?: unknown;
			rejectedLabels?: unknown;
		};

		const nextConfig: DecisionsConfig = {
			aliases: sanitizeAliases(body.aliases),
			rejectedLabels: sanitizeRejectedLabels(body.rejectedLabels),
			updatedAt: new Date().toISOString(),
		};

			const userId = `${authResult.user.id || ''}`.trim();
			if (!userId) {
				return NextResponse.json({ success: false, error: 'Missing user id' }, { status: 401 });
			}

			const key = platformKey(userId);
		await prisma.integrationSetting.upsert({
			where: { platform: key },
			update: {
				enabled: true,
				syncStatus: 'manual',
				lastSyncAt: new Date(),
				config: nextConfig,
			},
			create: {
				platform: key,
				enabled: true,
				syncStatus: 'manual',
				lastSyncAt: new Date(),
				config: nextConfig,
			},
		});

		return NextResponse.json({
			success: true,
			decisions: nextConfig,
		});
	} catch (error) {
		console.error('PUT /api/gmail/property-decisions error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to save property decisions',
			},
			{ status: 500 }
		);
	}
}
