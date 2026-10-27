import apiClient from './apiClient';

/**
 * Fetches recent events with optional limit.
 * Leverages shared Axios client with auth/token handling.
 *
 * @param {number} limit - Max number of events to fetch (default: 10)
 * @returns {Promise<Array>} Array of event objects or empty array
 */
export async function fetchRecentEvents(limit = 10) {
  try {
    const response = await apiClient.get(`/api/events?limit=${limit}`);
    return response.data?.results || [];
  } catch (error) {
    console.error("❌ Failed to fetch events:", error.response?.data || error.message);
    return []; // Return safe fallback
  }
}
