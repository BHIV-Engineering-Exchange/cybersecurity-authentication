const express = require('express');
const router = express.Router();
const PoliceStation = require('../models/PoliceStation');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// Get all police stations (public endpoint for police station selection)
router.get('/stations', async (req, res) => {
  try {
    const { state, city, specialization, priority, search } = req.query;
    
    // Build filter object
    const filter = { isActive: true };
    
    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }
    
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }
    
    if (specialization) {
      filter.specialization = { $regex: specialization, $options: 'i' };
    }
    
    if (priority) {
      filter.priority = priority;
    }
    
    if (search) {
      filter.$or = [
        { zoneRangeDistrict: { $regex: search, $options: 'i' } },
        { officeContact: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }
    
    const stations = await PoliceStation.find(filter)
      .select('zoneRangeDistrict officeContact officeContactMobile email state city specialization priority')
      .sort({ priority: -1, state: 1, city: 1 });
    
    res.json({
      success: true,
      count: stations.length,
      data: stations
    });
  } catch (error) {
    console.error('Error fetching police stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch police stations'
    });
  }
});

// Get police station by ID
router.get('/stations/:id', async (req, res) => {
  try {
    const station = await PoliceStation.findById(req.params.id);
    
    if (!station) {
      return res.status(404).json({
        success: false,
        error: 'Police station not found'
      });
    }
    
    res.json({
      success: true,
      data: station
    });
  } catch (error) {
    console.error('Error fetching police station:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch police station'
    });
  }
});

// Search police stations by location
router.get('/stations/search/location', async (req, res) => {
  try {
    const { location } = req.query;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location parameter is required'
      });
    }
    
    const stations = await PoliceStation.findByLocation(location);
    
    res.json({
      success: true,
      count: stations.length,
      data: stations
    });
  } catch (error) {
    console.error('Error searching police stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search police stations'
    });
  }
});

// Get all states
router.get('/states', async (req, res) => {
  try {
    const states = await PoliceStation.getStates();
    
    res.json({
      success: true,
      count: states.length,
      data: states.sort()
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch states'
    });
  }
});

// Get all cities
router.get('/cities', async (req, res) => {
  try {
    const { state } = req.query;
    
    let filter = { isActive: true };
    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }
    
    const cities = await PoliceStation.distinct('city', filter);
    
    res.json({
      success: true,
      count: cities.length,
      data: cities.sort()
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cities'
    });
  }
});

// Get all specializations
router.get('/specializations', async (req, res) => {
  try {
    const specializations = await PoliceStation.distinct('specialization', { isActive: true });
    
    res.json({
      success: true,
      count: specializations.length,
      data: specializations.sort()
    });
  } catch (error) {
    console.error('Error fetching specializations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch specializations'
    });
  }
});

// Get station statistics (admin only)
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalStations = await PoliceStation.countDocuments({ isActive: true });
    const stationsByState = await PoliceStation.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const stationsByPriority = await PoliceStation.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const stationsBySpecialization = await PoliceStation.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalStations,
        byState: stationsByState,
        byPriority: stationsByPriority,
        bySpecialization: stationsBySpecialization
      }
    });
  } catch (error) {
    console.error('Error fetching station statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch station statistics'
    });
  }
});

// Create new police station (admin only)
router.post('/stations', auth, adminOnly, async (req, res) => {
  try {
    const stationData = req.body;
    
    const station = new PoliceStation(stationData);
    await station.save();
    
    res.status(201).json({
      success: true,
      data: station
    });
  } catch (error) {
    console.error('Error creating police station:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create police station'
    });
  }
});

// Update police station (admin only)
router.put('/stations/:id', auth, adminOnly, async (req, res) => {
  try {
    const station = await PoliceStation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!station) {
      return res.status(404).json({
        success: false,
        error: 'Police station not found'
      });
    }
    
    res.json({
      success: true,
      data: station
    });
  } catch (error) {
    console.error('Error updating police station:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update police station'
    });
  }
});

// Delete police station (admin only)
router.delete('/stations/:id', auth, adminOnly, async (req, res) => {
  try {
    const station = await PoliceStation.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!station) {
      return res.status(404).json({
        success: false,
        error: 'Police station not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Police station deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting police station:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete police station'
    });
  }
});

// Bulk import police stations (admin only)
router.post('/stations/bulk-import', auth, adminOnly, async (req, res) => {
  try {
    const { stations } = req.body;
    
    if (!Array.isArray(stations)) {
      return res.status(400).json({
        success: false,
        error: 'Stations must be an array'
      });
    }
    
    const result = await PoliceStation.insertMany(stations);
    
    res.status(201).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('Error bulk importing police stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk import police stations'
    });
  }
});

// Public seed endpoint for testing (no auth required)
router.post('/seed-public', async (req, res) => {
  try {
    // Sample police station data based on the Excel structure
    const samplePoliceStations = [
      {
        zoneRangeDistrict: "Central Zone - Delhi",
        officeContact: "Shri Rajesh Kumar, ACP",
        officeContactMobile: "9876543210",
        email: "central.zone@delhipolice.gov.in",
        state: "Delhi",
        city: "New Delhi",
        specialization: "Cybercrime Investigation",
        priority: "high"
      },
      {
        zoneRangeDistrict: "South Zone - Mumbai",
        officeContact: "Shri Amit Sharma, DCP",
        officeContactMobile: "9876543211",
        email: "south.zone@mumbaipolice.gov.in",
        state: "Maharashtra",
        city: "Mumbai",
        specialization: "Economic Offences",
        priority: "high"
      },
      {
        zoneRangeDistrict: "North Zone - Bangalore",
        officeContact: "Shri Suresh Reddy, ACP",
        officeContactMobile: "9876543212",
        email: "north.zone@bangalorepolice.gov.in",
        state: "Karnataka",
        city: "Bangalore",
        specialization: "Financial Crimes",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "East Zone - Kolkata",
        officeContact: "Shri Pradeep Das, DCP",
        officeContactMobile: "9876543213",
        email: "east.zone@kolkatapolice.gov.in",
        state: "West Bengal",
        city: "Kolkata",
        specialization: "Cybercrime Investigation",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "West Zone - Chennai",
        officeContact: "Shri Ravi Kumar, ACP",
        officeContactMobile: "9876543214",
        email: "west.zone@chennaipolice.gov.in",
        state: "Tamil Nadu",
        city: "Chennai",
        specialization: "Digital Evidence",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "Central Range - Hyderabad",
        officeContact: "Shri Venkatesh Rao, DCP",
        officeContactMobile: "9876543215",
        email: "central.range@hyderabadpolice.gov.in",
        state: "Telangana",
        city: "Hyderabad",
        specialization: "Cybercrime Investigation",
        priority: "high"
      },
      {
        zoneRangeDistrict: "Metro Range - Pune",
        officeContact: "Shri Ajay Patil, ACP",
        officeContactMobile: "9876543216",
        email: "metro.range@punepolice.gov.in",
        state: "Maharashtra",
        city: "Pune",
        specialization: "Economic Offences",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "City Range - Ahmedabad",
        officeContact: "Shri Dharmendra Sharma, IPS",
        officeContactMobile: "9978408719",
        email: "cc-cid@gujarat.gov.in",
        state: "Gujarat",
        city: "Ahmedabad",
        specialization: "Cybercrime Investigation",
        priority: "high"
      },
      {
        zoneRangeDistrict: "District Range - Jaipur",
        officeContact: "Shri Ashok Kumar Rathore, ADGP",
        officeContactMobile: "9876543218",
        email: "district.range@rajasthanpolice.gov.in",
        state: "Rajasthan",
        city: "Jaipur",
        specialization: "Criminal Investigation",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "State Range - Lucknow",
        officeContact: "Shri Vikram Singh, IGP",
        officeContactMobile: "9876543219",
        email: "state.range@uppolice.gov.in",
        state: "Uttar Pradesh",
        city: "Lucknow",
        specialization: "Cybercrime Investigation",
        priority: "high"
      }
    ];
    
    // Clear existing data
    await PoliceStation.deleteMany({});
    
    // Insert sample data
    const result = await PoliceStation.insertMany(samplePoliceStations);
    
    // Get summary statistics
    const states = await PoliceStation.distinct('state');
    const cities = await PoliceStation.distinct('city');
    const specializations = await PoliceStation.distinct('specialization');
    
    res.json({
      success: true,
      message: 'Police stations seeded successfully',
      count: result.length,
      summary: {
        totalStations: result.length,
        states: states.length,
        cities: cities.length,
        specializations: specializations.length,
        highPriority: await PoliceStation.countDocuments({ priority: 'high' }),
        mediumPriority: await PoliceStation.countDocuments({ priority: 'medium' }),
        lowPriority: await PoliceStation.countDocuments({ priority: 'low' })
      }
    });
  } catch (error) {
    console.error('Error seeding police stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed police stations'
    });
  }
});

// Seed police stations with sample data (admin only)
router.post('/seed', auth, adminOnly, async (req, res) => {
  try {
    // Sample police station data based on the Excel structure
    const samplePoliceStations = [
      {
        zoneRangeDistrict: "Central Zone - Delhi",
        officeContact: "Shri Rajesh Kumar, ACP",
        officeContactMobile: "9876543210",
        email: "central.zone@delhipolice.gov.in",
        state: "Delhi",
        city: "New Delhi",
        specialization: "Cybercrime Investigation",
        priority: "high"
      },
      {
        zoneRangeDistrict: "South Zone - Mumbai",
        officeContact: "Shri Amit Sharma, DCP",
        officeContactMobile: "9876543211",
        email: "south.zone@mumbaipolice.gov.in",
        state: "Maharashtra",
        city: "Mumbai",
        specialization: "Economic Offences",
        priority: "high"
      },
      {
        zoneRangeDistrict: "North Zone - Bangalore",
        officeContact: "Shri Suresh Reddy, ACP",
        officeContactMobile: "9876543212",
        email: "north.zone@bangalorepolice.gov.in",
        state: "Karnataka",
        city: "Bangalore",
        specialization: "Financial Crimes",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "East Zone - Kolkata",
        officeContact: "Shri Pradeep Das, DCP",
        officeContactMobile: "9876543213",
        email: "east.zone@kolkatapolice.gov.in",
        state: "West Bengal",
        city: "Kolkata",
        specialization: "Cybercrime Investigation",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "West Zone - Chennai",
        officeContact: "Shri Ravi Kumar, ACP",
        officeContactMobile: "9876543214",
        email: "west.zone@chennaipolice.gov.in",
        state: "Tamil Nadu",
        city: "Chennai",
        specialization: "Digital Evidence",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "Central Range - Hyderabad",
        officeContact: "Shri Venkatesh Rao, DCP",
        officeContactMobile: "9876543215",
        email: "central.range@hyderabadpolice.gov.in",
        state: "Telangana",
        city: "Hyderabad",
        specialization: "Cybercrime Investigation",
        priority: "high"
      },
      {
        zoneRangeDistrict: "Metro Range - Pune",
        officeContact: "Shri Ajay Patil, ACP",
        officeContactMobile: "9876543216",
        email: "metro.range@punepolice.gov.in",
        state: "Maharashtra",
        city: "Pune",
        specialization: "Economic Offences",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "City Range - Ahmedabad",
        officeContact: "Shri Dharmendra Sharma, IPS",
        officeContactMobile: "9978408719",
        email: "cc-cid@gujarat.gov.in",
        state: "Gujarat",
        city: "Ahmedabad",
        specialization: "Cybercrime Investigation",
        priority: "high"
      },
      {
        zoneRangeDistrict: "District Range - Jaipur",
        officeContact: "Shri Ashok Kumar Rathore, ADGP",
        officeContactMobile: "9876543218",
        email: "district.range@rajasthanpolice.gov.in",
        state: "Rajasthan",
        city: "Jaipur",
        specialization: "Criminal Investigation",
        priority: "medium"
      },
      {
        zoneRangeDistrict: "State Range - Lucknow",
        officeContact: "Shri Vikram Singh, IGP",
        officeContactMobile: "9876543219",
        email: "state.range@uppolice.gov.in",
        state: "Uttar Pradesh",
        city: "Lucknow",
        specialization: "Cybercrime Investigation",
        priority: "high"
      }
    ];
    
    // Clear existing data
    await PoliceStation.deleteMany({});
    
    // Insert sample data
    const result = await PoliceStation.insertMany(samplePoliceStations);
    
    // Get summary statistics
    const states = await PoliceStation.distinct('state');
    const cities = await PoliceStation.distinct('city');
    const specializations = await PoliceStation.distinct('specialization');
    
    res.json({
      success: true,
      message: 'Police stations seeded successfully',
      count: result.length,
      summary: {
        totalStations: result.length,
        states: states.length,
        cities: cities.length,
        specializations: specializations.length,
        highPriority: await PoliceStation.countDocuments({ priority: 'high' }),
        mediumPriority: await PoliceStation.countDocuments({ priority: 'medium' }),
        lowPriority: await PoliceStation.countDocuments({ priority: 'low' })
      }
    });
  } catch (error) {
    console.error('Error seeding police stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed police stations'
    });
  }
});

module.exports = router;
