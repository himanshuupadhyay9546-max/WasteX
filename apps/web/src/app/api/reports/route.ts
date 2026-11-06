import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reports = await queryDb(`
      SELECT 
        id, 
        ticket_number, 
        address_landmark, 
        latitude, 
        longitude, 
        photo_url, 
        ai_detected_volume_m3, 
        ai_confidence_pct, 
        points_awarded, 
        status, 
        created_at 
      FROM citizen_dump_reports 
      ORDER BY created_at DESC 
      LIMIT 20;
    `);

    const incidents = await queryDb(`
      SELECT 
        id, 
        incident_code, 
        source_feed, 
        landmark_address, 
        latitude, 
        longitude, 
        waste_class, 
        estimated_volume_m3, 
        estimated_weight_kg, 
        ai_confidence_pct, 
        severity, 
        status, 
        flying_squad_unit, 
        created_at 
      FROM illegal_dumping_incidents 
      ORDER BY created_at DESC 
      LIMIT 20;
    `);

    return NextResponse.json({
      success: true,
      reports: reports || [],
      incidents: incidents || []
    });
  } catch (error: any) {
    console.error('Fetch reports error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Database error fetching reports.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const address = (body.address || 'Bhopal Ward 48 Roadside Dump').trim();
    const photoUrl = (body.photoUrl || '/assets/demo_dump.jpg').trim();
    const volumeM3 = parseFloat(body.volumeM3 || '3.4');
    const weightKg = parseFloat(body.weightKg || '520');
    const confidencePct = parseFloat(body.confidencePct || '95.4');
    const citizenEmail = (body.citizenEmail || '').trim().toLowerCase();
    const wasteClass = (body.wasteClass || 'Illegal Roadside Mixed Waste & Plastics').trim();
    const lat = parseFloat(body.lat || '23.2380');
    const lng = parseFloat(body.lng || '77.4340');

    // Generate unique municipal ticket number
    const randomTicketSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `BMC-BPL-2026-${randomTicketSuffix}`;
    const incidentCode = `DUMP-BPL-${randomTicketSuffix}`;

    // Find citizen UUID if logged in
    let citizenId = null;
    if (citizenEmail) {
      const userRows = await queryDb(
        `SELECT id, eco_points_balance FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [citizenEmail]
      );
      if (userRows && userRows.length > 0) {
        citizenId = userRows[0].id;
        // Award +50 EcoPoints directly in PostgreSQL
        await queryDb(
          `UPDATE users SET eco_points_balance = eco_points_balance + 50 WHERE id = $1`,
          [citizenId]
        );
      }
    }

    // Insert into citizen_dump_reports
    const insertReport = await queryDb(
      `INSERT INTO citizen_dump_reports (
        id, 
        ticket_number, 
        citizen_id, 
        address_landmark, 
        latitude, 
        longitude, 
        photo_url, 
        ai_detected_volume_m3, 
        ai_confidence_pct, 
        points_awarded, 
        status, 
        created_at
      ) VALUES (
        gen_random_uuid(), 
        $1, 
        $2, 
        $3, 
        $4, 
        $5, 
        $6, 
        $7, 
        $8, 
        50, 
        'reported', 
        NOW()
      ) RETURNING id, ticket_number, address_landmark, points_awarded, status, created_at;`,
      [ticketNumber, citizenId, address, lat, lng, photoUrl, volumeM3, confidencePct]
    );

    // Insert into illegal_dumping_incidents with matching enums ('high', 'detected_by_ai')
    await queryDb(
      `INSERT INTO illegal_dumping_incidents (
        id, 
        incident_code, 
        source_feed, 
        landmark_address, 
        latitude, 
        longitude, 
        waste_class, 
        estimated_volume_m3, 
        estimated_weight_kg, 
        ai_confidence_pct, 
        severity, 
        status, 
        flying_squad_unit, 
        created_at
      ) VALUES (
        gen_random_uuid(), 
        $1, 
        'Citizen Mobile App (Ward 48)', 
        $2, 
        $3, 
        $4, 
        $5, 
        $6, 
        $7, 
        $8, 
        'high', 
        'detected_by_ai', 
        'Pending Zonal Dispatch', 
        NOW()
      );`,
      [incidentCode, address, lat, lng, wasteClass, volumeM3, weightKg, confidencePct]
    );

    return NextResponse.json({
      success: true,
      message: 'Citizen report successfully submitted and registered in municipal dispatch queue.',
      ticket: {
        id: insertReport[0]?.id,
        ticketNumber,
        incidentCode,
        address,
        wasteClass,
        volumeM3,
        weightKg,
        pointsAwarded: 50,
        status: 'reported',
        assignedSupervisor: 'Sunil K. Dubey (Zone 1 & 2)',
        targetSquad: 'Pending Dispatch (EV-01 / TRK-02)',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Submit report error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Database error submitting citizen report.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { ticketNumber, incidentCode, action, assignedUnit } = body;

    const reportStatus = 
      action === 'dispatch' ? 'dispatched' :
      action === 'verify' ? 'verified' :
      action === 'resolve' ? 'resolved' : 'in_progress';

    const incidentEnumStatus = 
      action === 'dispatch' ? 'squad_dispatched' :
      action === 'verify' ? 'verified' :
      action === 'resolve' ? 'cleaned' : 'detected_by_ai';

    const squadUnit = assignedUnit || 'EV-01 (Tata Ace EV 1000)';

    // Update citizen_dump_reports
    if (ticketNumber) {
      await queryDb(
        `UPDATE citizen_dump_reports SET status = $1 WHERE ticket_number = $2`,
        [reportStatus, ticketNumber]
      );
    }

    // Update illegal_dumping_incidents
    if (incidentCode) {
      if (action === 'resolve') {
        await queryDb(
          `UPDATE illegal_dumping_incidents 
           SET status = $1, flying_squad_unit = $2, resolved_at = NOW() 
           WHERE incident_code = $3`,
          [incidentEnumStatus, squadUnit, incidentCode]
        );
      } else {
        await queryDb(
          `UPDATE illegal_dumping_incidents 
           SET status = $1, flying_squad_unit = $2 
           WHERE incident_code = $3`,
          [incidentEnumStatus, squadUnit, incidentCode]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Incident updated successfully`,
      status: reportStatus,
      assignedUnit: squadUnit
    });
  } catch (error: any) {
    console.error('Update incident error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Database error updating incident.' },
      { status: 500 }
    );
  }
}
