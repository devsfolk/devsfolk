import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '') || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminEmail = process.env.SUPABASE_ADMIN_EMAIL || 'devsfolk@gmail.com';
const adminPassword = process.env.SUPABASE_ADMIN_PASSWORD || 'lTCBkXW0HA4rNh0r';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase configuration in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  console.log(`Attempting to create admin user: ${adminEmail}`);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('User already exists. Attempting to update password...');
      
      // Get the user ID first
      const { data, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Error listing users:', listError.message);
        return;
      }
      
      const user = data?.users?.find((u: any) => u.email === adminEmail);
      if (user) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
          password: adminPassword
        });
        
        if (updateError) {
          console.error('Error updating password:', updateError.message);
        } else {
          console.log('Password updated successfully.');
        }
      } else {
        console.error('User not found in list despite "already registered" error.');
      }
    } else {
      console.error('Error creating user:', error.message);
    }
  } else {
    console.log('Admin user created successfully!');
  }
}

createAdmin();
