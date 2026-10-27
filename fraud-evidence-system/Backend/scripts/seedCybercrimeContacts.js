const mongoose = require('mongoose');
const CybercrimeContact = require('../models/CybercrimeContact');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-evidence-system');
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Function to extract state and city from officer designation and address
const extractLocationInfo = (officerDesignation, address) => {
  let state = '';
  let city = '';
  
  // Extract state from officer designation
  const statePatterns = [
    /\(([^)]+)\)/g, // Extract text in parentheses
    /(Gujarat|Maharashtra|Karnataka|Tamil Nadu|Kerala|West Bengal|Rajasthan|Uttar Pradesh|Madhya Pradesh|Bihar|Odisha|Assam|Jammu & Kashmir|Himachal Pradesh|Punjab|Haryana|Delhi|Goa|Chhattisgarh|Jharkhand|Uttarakhand|Manipur|Meghalaya|Mizoram|Nagaland|Arunachal Pradesh|Sikkim|Tripura|Andhra Pradesh|Telangana)/gi
  ];
  
  for (const pattern of statePatterns) {
    const matches = officerDesignation.match(pattern);
    if (matches) {
      state = matches[0].replace(/[()]/g, '').trim();
      break;
    }
  }
  
  // Extract city from officer designation
  const cityPatterns = [
    /^([^(]+)/, // Text before parentheses
    /(Agartala|Ahmedabad|Bangalore|Mumbai|Bhopal|Bhubaneshwar|Chandigarh|Chennai|Dehradun|Gangtok|Guwahati|Hyderabad|Jaipur|Jammu|Kanpur|Kolkata|Nagpur|New Delhi|Panaji|Patna|Raipur|Ranchi|Thiruvananthapuram)/gi
  ];
  
  for (const pattern of cityPatterns) {
    const matches = officerDesignation.match(pattern);
    if (matches) {
      city = matches[0].trim();
      break;
    }
  }
  
  return { state, city };
};

// Function to determine priority based on location and type
const determinePriority = (officerDesignation, address) => {
  const highPriorityKeywords = ['FBI', 'Cyber Crime Cell', 'State Cyber', 'Economic Offences Wing'];
  const mediumPriorityKeywords = ['Police', 'CID', 'Crime Branch'];
  
  const text = `${officerDesignation} ${address}`.toLowerCase();
  
  if (highPriorityKeywords.some(keyword => text.includes(keyword.toLowerCase()))) {
    return 'high';
  } else if (mediumPriorityKeywords.some(keyword => text.includes(keyword.toLowerCase()))) {
    return 'medium';
  }
  
  return 'low';
};

// Function to determine specialization
const determineSpecialization = (officerDesignation, address) => {
  const text = `${officerDesignation} ${address}`.toLowerCase();
  
  if (text.includes('cyber') || text.includes('cybercrime')) {
    return 'Cybercrime Investigation';
  } else if (text.includes('economic') || text.includes('eow')) {
    return 'Economic Offences';
  } else if (text.includes('fraud') || text.includes('financial')) {
    return 'Financial Crimes';
  } else if (text.includes('cid') || text.includes('crime branch')) {
    return 'Criminal Investigation';
  }
  
  return 'General Law Enforcement';
};

// Main seeding function
const seedCybercrimeContacts = async () => {
  try {
    console.log('🌱 Starting cybercrime contacts seeding...');
    
    // Read the JSON file
    const jsonPath = path.join(__dirname, '../../Frontend/cybercrime_contacts.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const contactsData = JSON.parse(rawData);
    
    console.log(`📊 Found ${contactsData.length} contacts to seed`);
    
    // Clear existing data
    await CybercrimeContact.deleteMany({});
    console.log('🗑️ Cleared existing cybercrime contacts');
    
    // Process and insert data
    const processedContacts = [];
    
    for (const contact of contactsData) {
      // Skip invalid entries
      if (!contact['Officer/Designation'] || contact['Officer/Designation'] === null) {
        continue;
      }
      
      const { state, city } = extractLocationInfo(
        contact['Officer/Designation'], 
        contact['Address'] || ''
      );
      
      const processedContact = {
        regionalOffice: contact['Regional Office'] || '',
        officerDesignation: contact['Officer/Designation'],
        address: contact['Address'] || '',
        email: contact['Email'] || [],
        mobile: contact['Mobile'] || [],
        telephone: contact['Telephone'] || [],
        fax: contact['Fax'] || [],
        state: state,
        city: city,
        specialization: determineSpecialization(
          contact['Officer/Designation'], 
          contact['Address'] || ''
        ),
        priority: determinePriority(
          contact['Officer/Designation'], 
          contact['Address'] || ''
        ),
        isActive: true
      };
      
      processedContacts.push(processedContact);
    }
    
    // Insert all contacts
    const result = await CybercrimeContact.insertMany(processedContacts);
    console.log(`✅ Successfully seeded ${result.length} cybercrime contacts`);
    
    // Display summary
    const states = await CybercrimeContact.distinct('state');
    const cities = await CybercrimeContact.distinct('city');
    const specializations = await CybercrimeContact.distinct('specialization');
    
    console.log('\n📈 Seeding Summary:');
    console.log(`   States: ${states.length}`);
    console.log(`   Cities: ${cities.length}`);
    console.log(`   Specializations: ${specializations.length}`);
    console.log(`   High Priority: ${await CybercrimeContact.countDocuments({ priority: 'high' })}`);
    console.log(`   Medium Priority: ${await CybercrimeContact.countDocuments({ priority: 'medium' })}`);
    console.log(`   Low Priority: ${await CybercrimeContact.countDocuments({ priority: 'low' })}`);
    
    console.log('\n🎯 Sample contacts:');
    const sampleContacts = await CybercrimeContact.find().limit(3);
    sampleContacts.forEach((contact, index) => {
      console.log(`   ${index + 1}. ${contact.officerDesignation} - ${contact.city}, ${contact.state}`);
    });
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  }
};

// Run the seeding
const runSeeding = async () => {
  try {
    await connectDB();
    await seedCybercrimeContacts();
    console.log('\n🎉 Cybercrime contacts seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runSeeding();
}

module.exports = { seedCybercrimeContacts, connectDB };
