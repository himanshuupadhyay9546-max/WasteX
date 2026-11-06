import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userCount = await queryDb('SELECT COUNT(*) as count FROM users');
    const vehicleCount = await queryDb('SELECT COUNT(*) as count FROM vehicles');
    const binCount = await queryDb('SELECT COUNT(*) as count FROM smart_bins');
    const dumpCount = await queryDb('SELECT COUNT(*) as count FROM illegal_dumping_incidents');
    const bins = await queryDb('SELECT bin_code, address, category, current_fill_pct, latitude, longitude FROM smart_bins ORDER BY bin_code ASC LIMIT 10');
    const vehicles = await queryDb('SELECT vehicle_code, model_name, fuel_type, battery_or_fuel_pct, live_speed_kmh FROM vehicles ORDER BY vehicle_code ASC LIMIT 10');

    return NextResponse.json({
      status: 'connected',
      database: 'wastex',
      host: 'localhost:5432',
      counts: {
        users: parseInt(userCount[0]?.count || '0', 10),
        vehicles: parseInt(vehicleCount[0]?.count || '0', 10),
        smart_bins: parseInt(binCount[0]?.count || '0', 10),
        illegal_dumping_incidents: parseInt(dumpCount[0]?.count || '0', 10),
      },
      bins,
      vehicles,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: 'wastex',
      message: error?.message || 'Database connection error',
    }, { status: 500 });
  }
}
