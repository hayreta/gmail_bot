const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Get or create user
async function getUser(userId, firstName, username) {
  try {
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // User doesn't exist, create new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          telegram_id: userId,
          first_name: firstName,
          username: username ? `@${username}` : null,
          points: 0,
          referrals: 0,
          registered: 0,
          joined: new Date()
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      return newUser;
    }

    if (error) throw error;
    return user;
  } catch (e) {
    console.error('Error getting/creating user:', e);
    throw e;
  }
}

// Add points to user
async function addPoints(userId, amount, reason = 'manual') {
  try {
    const { error: transactionError } = await supabase
      .from('points_transactions')
      .insert([{
        user_id: userId,
        amount: amount,
        reason: reason,
        created_at: new Date()
      }]);

    if (transactionError) throw transactionError;

    const { data, error: updateError } = await supabase
      .from('users')
      .update({ points: supabase.raw('points + ' + amount) })
      .eq('telegram_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;
    return data;
  } catch (e) {
    console.error('Error adding points:', e);
    throw e;
  }
}

// Remove points from user
async function removePoints(userId, amount, reason = 'manual') {
  try {
    const { error: transactionError } = await supabase
      .from('points_transactions')
      .insert([{
        user_id: userId,
        amount: -amount,
        reason: reason,
        created_at: new Date()
      }]);

    if (transactionError) throw transactionError;

    const { data, error: updateError } = await supabase
      .from('users')
      .update({ points: supabase.raw('points - ' + amount) })
      .eq('telegram_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;
    return data;
  } catch (e) {
    console.error('Error removing points:', e);
    throw e;
  }
}

// Increment registered gmails
async function incrementRegistered(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ registered: supabase.raw('registered + 1') })
      .eq('telegram_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Error incrementing registered:', e);
    throw e;
  }
}

// Check if user was referred by someone
async function getUserReferral(userId) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('referred_by')
      .eq('referred_user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    
    return data?.referred_by || null;
  } catch (e) {
    console.error('Error getting referral:', e);
    return null;
  }
}

// Add referral
async function addReferral(referrerUserId, referredUserId) {
  try {
    // Check if already referred
    const existing = await getUserReferral(referredUserId);
    if (existing) return false;

    const { error: refError } = await supabase
      .from('referrals')
      .insert([{
        referred_by: referrerUserId,
        referred_user_id: referredUserId,
        created_at: new Date()
      }]);

    if (refError) throw refError;

    // Add points and increment referral count
    await addPoints(referrerUserId, 1, 'referral');
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ referrals: supabase.raw('referrals + 1') })
      .eq('telegram_id', referrerUserId);

    if (updateError) throw updateError;

    return true;
  } catch (e) {
    console.error('Error adding referral:', e);
    throw e;
  }
}

// Get all users (for admin)
async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('joined', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error getting all users:', e);
    return [];
  }
}

// Log admin action
async function logAdminAction(adminId, action, details) {
  try {
    await supabase
      .from('admin_logs')
      .insert([{
        admin_id: adminId,
        action: action,
        details: details,
        created_at: new Date()
      }]);
  } catch (e) {
    console.error('Error logging admin action:', e);
  }
}

module.exports = {
  supabase,
  getUser,
  addPoints,
  removePoints,
  incrementRegistered,
  getUserReferral,
  addReferral,
  getAllUsers,
  logAdminAction
};
