const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-evidence-system');
    console.log('✅ MongoDB connected for direct seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample police station data
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

// Direct seeding function
const seedDirectly = async () => {
  try {
    console.log('🌱 Starting direct police stations seeding...');
    
    // Import the model
    const PoliceStation = require('../models/PoliceStation');
    
    // Clear existing data
    await PoliceStation.deleteMany({});
    console.log('🗑️ Cleared existing police stations');
    
    // Insert sample data
    const result = await PoliceStation.insertMany(samplePoliceStations);
    console.log(`✅ Successfully seeded ${result.length} police stations`);
    
    // Display summary
    const states = await PoliceStation.distinct('state');
    const cities = await PoliceStation.distinct('city');
    
    console.log('\n📈 Seeding Summary:');
    console.log(`   States: ${states.length}`);
    console.log(`   Cities: ${cities.length}`);
    console.log(`   High Priority: ${await PoliceStation.countDocuments({ priority: 'high' })}`);
    console.log(`   Medium Priority: ${await PoliceStation.countDocuments({ priority: 'medium' })}`);
    
    console.log('\n🎯 Sample stations:');
    const sampleStations = await PoliceStation.find().limit(3);
    sampleStations.forEach((station, index) => {
      console.log(`   ${index + 1}. ${station.zoneRangeDistrict} - ${station.officeContact}`);
    });
    
    console.log('\n🎉 Direct seeding completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Direct seeding error:', error);
    process.exit(1);
  }
};

// Run the seeding
const runSeeding = async () => {
  try {
    await connectDB();
    await seedDirectly();
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runSeeding();
}

module.exports = { seedDirectly, connectDB };
