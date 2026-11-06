import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = (body.fullName || '').trim();
    let email = (body.email || '').trim().toLowerCase();
    let phoneNumber = (body.phoneNumber || body.identifier || '').trim();
    const password = (body.password || '').trim();
    const role = (body.role || 'citizen').toLowerCase();

    // If identifier was passed instead of dedicated email/phone
    if (body.identifier) {
      if (body.identifier.includes('@')) {
        email = body.identifier.trim().toLowerCase();
      } else {
        phoneNumber = body.identifier.trim();
      }
    }

    if (!fullName) {
      return NextResponse.json(
        { success: false, message: 'Full name is required.' },
        { status: 400 }
      );
    }

    if (!email && !phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Please provide either a Gmail / Email address or Phone number.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 4 characters long.' },
        { status: 400 }
      );
    }

    // Validate role is an accepted enum
    const validRoles = ['citizen', 'driver', 'supervisor', 'admin'];
    const assignedRole = validRoles.includes(role) ? role : 'citizen';

    // Auto-generate email if only phone was provided
    if (!email && phoneNumber) {
      email = `${phoneNumber.replace(/[^0-9]/g, '')}@bhopal-wastex.local`;
    }

    const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9+]/g, '') : null;

    // Check if user already exists
    const existing = await queryDb(
      `SELECT id, email, phone_number FROM users 
       WHERE (email IS NOT NULL AND LOWER(email) = LOWER($1) AND $1 != '') 
          OR (phone_number IS NOT NULL AND phone_number = $2 AND $2 != '')
       LIMIT 1`,
      [email || '', cleanPhone || '']
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'An account with this Phone number or Gmail already exists.' },
        { status: 409 }
      );
    }

    // Hash password securely
    const hashed = hashPassword(password);

    // Determine zone name
    const zoneName = 
      assignedRole === 'admin' ? 'BMC Central Command (Bhopal)' :
      assignedRole === 'supervisor' ? 'Zone 1 & 2 (MP Nagar & Arera Colony)' :
      assignedRole === 'driver' ? 'Zone 1 (MP Nagar)' : 'Ward 48 (Arera Colony)';

    // Insert new user into PostgreSQL
    const inserted = await queryDb(
      `INSERT INTO users (id, full_name, email, phone_number, password_hash, role, zone_name, eco_points_balance, is_active, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 100, true, NOW())
       RETURNING id, full_name, email, phone_number, role, zone_name`,
      [fullName, email || null, cleanPhone || null, hashed, assignedRole, zoneName]
    );

    const newUser = inserted[0];

    return NextResponse.json({
      success: true,
      message: 'Account created successfully in PostgreSQL database.',
      user: {
        id: newUser.id,
        name: newUser.full_name,
        email: newUser.email,
        phoneNumber: newUser.phone_number,
        role: newUser.role,
        zone: newUser.zone_name,
        truckId: newUser.role === 'driver' ? 'EV-01 (Tata Ace EV 1000)' : undefined
      }
    });

  } catch (error: any) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Database error creating new account.' },
      { status: 500 }
    );
  }
}
