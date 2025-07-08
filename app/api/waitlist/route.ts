import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);
    `);
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    await initializeDatabase();
    
    const client = await pool.connect();
    
    try {
      await client.query('INSERT INTO waitlist (email) VALUES ($1)', [email]);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email added to waitlist successfully' 
      }, { status: 201 });
    } catch (error: any) {
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'Email already exists in waitlist' 
        }, { status: 409 });
      }
      
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding email to waitlist:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}