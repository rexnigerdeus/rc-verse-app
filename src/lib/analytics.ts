import { supabase } from "./supabase";

export const trackEvent = async (eventName: string, details: object = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('analytics').insert({
      user_id: user.id,
      event_name: eventName,
      details: details
    });
  } catch (error) {
    console.log("Analytics Error:", error);
  }
};