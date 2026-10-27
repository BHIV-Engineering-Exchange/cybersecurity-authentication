const axios = require('axios');

/**
 * IP Geo-Resolver Service
 * Resolves IP addresses to location and authority information
 * Uses free APIs: ipapi.co, ipinfo.io
 */
class IPGeoResolver {
  constructor() {
    this.apis = {
      ipapi: {
        url: 'https://ipapi.co/{ip}/json/',
        rateLimit: 1000, // requests per day
        requestsToday: 0,
        lastReset: new Date().toDateString()
      },
      ipinfo: {
        url: 'https://ipinfo.io/{ip}/json',
        rateLimit: 50000, // requests per month
        requestsToday: 0,
        lastReset: new Date().toDateString()
      }
    };
    
    // Indian Cybercrime Cell contacts by state
    this.indianCybercrimeCells = {
      'Andhra Pradesh': {
        city: 'Hyderabad',
        authority: 'Cyber Crime Police Station, Hyderabad',
        contact: {
          phone: '+91-40-27852000',
          email: 'cybercrime@tspolice.gov.in',
          address: 'Cyber Crime Police Station, Hyderabad, Telangana'
        }
      },
      'Karnataka': {
        city: 'Bangalore',
        authority: 'Cyber Crime Police Station, Bangalore',
        contact: {
          phone: '+91-80-22201000',
          email: 'cybercrime@karnataka.gov.in',
          address: 'Cyber Crime Police Station, Bangalore, Karnataka'
        }
      },
      'Maharashtra': {
        city: 'Mumbai',
        authority: 'Cyber Crime Police Station, Mumbai',
        contact: {
          phone: '+91-22-22048000',
          email: 'cybercrime@mumbai.gov.in',
          address: 'Cyber Crime Police Station, Mumbai, Maharashtra'
        }
      },
      'Delhi': {
        city: 'New Delhi',
        authority: 'Cyber Crime Police Station, Delhi',
        contact: {
          phone: '+91-11-23490000',
          email: 'cybercrime@delhipolice.gov.in',
          address: 'Cyber Crime Police Station, Delhi'
        }
      },
      'Tamil Nadu': {
        city: 'Chennai',
        authority: 'Cyber Crime Police Station, Chennai',
        contact: {
          phone: '+91-44-28520000',
          email: 'cybercrime@tnpolice.gov.in',
          address: 'Cyber Crime Police Station, Chennai, Tamil Nadu'
        }
      },
      'Gujarat': {
        city: 'Ahmedabad',
        authority: 'Cyber Crime Police Station, Ahmedabad',
        contact: {
          phone: '+91-79-23250798',
          email: 'cc-cid@gujarat.gov.in',
          address: 'Cyber Crime Police Station, Ahmedabad, Gujarat'
        }
      },
      'West Bengal': {
        city: 'Kolkata',
        authority: 'Cyber Crime Police Station, Kolkata',
        contact: {
          phone: '+91-33-22220000',
          email: 'cybercrime@kolkata.gov.in',
          address: 'Cyber Crime Police Station, Kolkata, West Bengal'
        }
      },
      'Rajasthan': {
        city: 'Jaipur',
        authority: 'Cyber Crime Police Station, Jaipur',
        contact: {
          phone: '+91-141-2201000',
          email: 'cybercrime@rajpolice.gov.in',
          address: 'Cyber Crime Police Station, Jaipur, Rajasthan'
        }
      },
      'Uttar Pradesh': {
        city: 'Lucknow',
        authority: 'Cyber Crime Police Station, Lucknow',
        contact: {
          phone: '+91-522-2201000',
          email: 'cybercrime@uppolice.gov.in',
          address: 'Cyber Crime Police Station, Lucknow, Uttar Pradesh'
        }
      },
      'Punjab': {
        city: 'Chandigarh',
        authority: 'Cyber Crime Police Station, Chandigarh',
        contact: {
          phone: '+91-172-2745000',
          email: 'cybercrime@punjab.gov.in',
          address: 'Cyber Crime Police Station, Chandigarh, Punjab'
        }
      }
    };
    
    // High-risk countries for cybercrime
    this.highRiskCountries = [
      'CN', 'RU', 'KP', 'IR', 'SY', 'VE', 'CU', 'MM', 'AF'
    ];
    
    // VPN/Proxy indicators
    this.vpnIndicators = [
      'vpn', 'proxy', 'tor', 'anonymous', 'private', 'cloud', 'hosting'
    ];
  }

  /**
   * Reset daily counters if new day
   */
  resetDailyCounters() {
    const today = new Date().toDateString();
    
    Object.keys(this.apis).forEach(api => {
      if (this.apis[api].lastReset !== today) {
        this.apis[api].requestsToday = 0;
        this.apis[api].lastReset = today;
      }
    });
  }

  /**
   * Check if API is available (rate limit not exceeded)
   */
  isApiAvailable(apiName) {
    this.resetDailyCounters();
    return this.apis[apiName].requestsToday < this.apis[apiName].rateLimit;
  }

  /**
   * Increment API request counter
   */
  incrementApiCounter(apiName) {
    this.apis[apiName].requestsToday++;
  }

  /**
   * Get geo information from ipapi.co
   */
  async getGeoFromIpapi(ip) {
    try {
      if (!this.isApiAvailable('ipapi')) {
        throw new Error('IPAPI rate limit exceeded');
      }

      const url = this.apis.ipapi.url.replace('{ip}', ip);
      const response = await axios.get(url, { timeout: 5000 });
      
      this.incrementApiCounter('ipapi');
      
      return {
        source: 'ipapi.co',
        ip: response.data.ip,
        city: response.data.city,
        region: response.data.region,
        country: response.data.country_name,
        countryCode: response.data.country_code,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        timezone: response.data.timezone,
        org: response.data.org,
        asn: response.data.asn,
        isp: response.data.org
      };
    } catch (error) {
      console.error('IPAPI error:', error.message);
      throw error;
    }
  }

  /**
   * Get geo information from ipinfo.io
   */
  async getGeoFromIpinfo(ip) {
    try {
      if (!this.isApiAvailable('ipinfo')) {
        throw new Error('IPINFO rate limit exceeded');
      }

      const url = this.apis.ipinfo.url.replace('{ip}', ip);
      const response = await axios.get(url, { timeout: 5000 });
      
      this.incrementApiCounter('ipinfo');
      
      return {
        source: 'ipinfo.io',
        ip: response.data.ip,
        city: response.data.city,
        region: response.data.region,
        country: response.data.country,
        countryCode: response.data.country,
        latitude: response.data.loc?.split(',')[0],
        longitude: response.data.loc?.split(',')[1],
        timezone: response.data.timezone,
        org: response.data.org,
        asn: response.data.org,
        isp: response.data.org,
        hostname: response.data.hostname,
        postal: response.data.postal
      };
    } catch (error) {
      console.error('IPINFO error:', error.message);
      throw error;
    }
  }

  /**
   * Get geo information with fallback
   */
  async getGeoInfo(ip) {
    // Validate IP address
    if (!this.isValidIP(ip)) {
      throw new Error('Invalid IP address format');
    }

    // Try ipapi.co first, then ipinfo.io
    const sources = ['ipapi', 'ipinfo'];
    
    for (const source of sources) {
      try {
        if (source === 'ipapi') {
          return await this.getGeoFromIpapi(ip);
        } else if (source === 'ipinfo') {
          return await this.getGeoFromIpinfo(ip);
        }
      } catch (error) {
        console.warn(`Failed to get geo info from ${source}:`, error.message);
        continue;
      }
    }
    
    throw new Error('All geo APIs failed');
  }

  /**
   * Validate IP address format
   */
  isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Check if country is high-risk
   */
  isHighRiskCountry(countryCode) {
    return this.highRiskCountries.includes(countryCode?.toUpperCase());
  }

  /**
   * Check if organization is VPN/Proxy
   */
  isVPNOrProxy(org) {
    if (!org) return false;
    
    const orgLower = org.toLowerCase();
    return this.vpnIndicators.some(indicator => orgLower.includes(indicator));
  }

  /**
   * Find nearest Indian cybercrime authority
   */
  findNearestAuthority(geoInfo) {
    const { country, region, city } = geoInfo;
    
    // If not in India, return general info
    if (country !== 'India' && countryCode !== 'IN') {
      return {
        authority: 'International Cybercrime Authority',
        contact: {
          phone: '+91-11-23490000',
          email: 'cybercrime@cybercrime.gov.in',
          address: 'Cyber Crime Police Station, Delhi (International Cases)'
        },
        isInternational: true
      };
    }
    
    // Find matching Indian authority
    const authority = Object.values(this.indianCybercrimeCells).find(cell => 
      cell.city.toLowerCase() === city?.toLowerCase() ||
      cell.city.toLowerCase().includes(region?.toLowerCase()) ||
      region?.toLowerCase().includes(cell.city.toLowerCase())
    );
    
    if (authority) {
      return {
        ...authority,
        isInternational: false
      };
    }
    
    // Default to Delhi if no match found
    return {
      ...this.indianCybercrimeCells['Delhi'],
      isInternational: false,
      note: 'Default authority - no specific match found'
    };
  }

  /**
   * Calculate risk score based on geo information
   */
  calculateRiskScore(geoInfo) {
    let riskScore = 0;
    const factors = [];
    
    // Country risk
    if (this.isHighRiskCountry(geoInfo.countryCode)) {
      riskScore += 40;
      factors.push('High-risk country');
    }
    
    // VPN/Proxy detection
    if (this.isVPNOrProxy(geoInfo.org)) {
      riskScore += 30;
      factors.push('VPN/Proxy detected');
    }
    
    // International location
    if (geoInfo.country !== 'India' && geoInfo.countryCode !== 'IN') {
      riskScore += 20;
      factors.push('International location');
    }
    
    // Suspicious organization patterns
    if (geoInfo.org) {
      const orgLower = geoInfo.org.toLowerCase();
      if (orgLower.includes('hosting') || orgLower.includes('cloud')) {
        riskScore += 15;
        factors.push('Hosting/Cloud service');
      }
    }
    
    // Timezone anomalies (simplified check)
    if (geoInfo.timezone && !geoInfo.timezone.includes('Asia/')) {
      riskScore += 10;
      factors.push('Non-Asian timezone');
    }
    
    return {
      score: Math.min(100, riskScore),
      factors,
      level: riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Main function to resolve IP to complete geo and authority info
   */
  async resolveIP(ip) {
    try {
      console.log(`🔍 Resolving IP: ${ip}`);
      
      // Get geo information
      const geoInfo = await this.getGeoInfo(ip);
      
      // Find nearest authority
      const authority = this.findNearestAuthority(geoInfo);
      
      // Calculate risk score
      const riskAssessment = this.calculateRiskScore(geoInfo);
      
      // Check for VPN/Proxy
      const isVPN = this.isVPNOrProxy(geoInfo.org);
      
      // Check for high-risk country
      const isHighRisk = this.isHighRiskCountry(geoInfo.countryCode);
      
      const result = {
        ip,
        geoInfo: {
          city: geoInfo.city,
          region: geoInfo.region,
          country: geoInfo.country,
          countryCode: geoInfo.countryCode,
          latitude: geoInfo.latitude,
          longitude: geoInfo.longitude,
          timezone: geoInfo.timezone,
          org: geoInfo.org,
          isp: geoInfo.isp
        },
        authority,
        riskAssessment,
        flags: {
          isVPN,
          isHighRiskCountry: isHighRisk,
          isInternational: authority.isInternational
        },
        timestamp: new Date().toISOString(),
        source: geoInfo.source
      };
      
      console.log(`✅ IP resolved: ${geoInfo.city}, ${geoInfo.country} (Risk: ${riskAssessment.level})`);
      
      return result;
      
    } catch (error) {
      console.error('❌ IP resolution failed:', error.message);
      
      // Return fallback data
      return {
        ip,
        geoInfo: null,
        authority: this.indianCybercrimeCells['Delhi'],
        riskAssessment: {
          score: 50,
          factors: ['Unable to resolve IP'],
          level: 'UNKNOWN'
        },
        flags: {
          isVPN: false,
          isHighRiskCountry: false,
          isInternational: true,
          resolutionFailed: true
        },
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Batch resolve multiple IPs
   */
  async batchResolveIPs(ips) {
    const results = [];
    
    for (const ip of ips) {
      try {
        const result = await this.resolveIP(ip);
        results.push(result);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          ip,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  /**
   * Get API usage statistics
   */
  getApiStats() {
    this.resetDailyCounters();
    
    return {
      ipapi: {
        requestsToday: this.apis.ipapi.requestsToday,
        rateLimit: this.apis.ipapi.rateLimit,
        remaining: this.apis.ipapi.rateLimit - this.apis.ipapi.requestsToday
      },
      ipinfo: {
        requestsToday: this.apis.ipinfo.requestsToday,
        rateLimit: this.apis.ipinfo.rateLimit,
        remaining: this.apis.ipinfo.rateLimit - this.apis.ipinfo.requestsToday
      }
    };
  }
}

module.exports = IPGeoResolver;

