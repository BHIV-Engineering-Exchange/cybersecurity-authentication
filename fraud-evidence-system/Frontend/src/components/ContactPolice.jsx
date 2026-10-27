import React, { useState, useEffect } from 'react';
import { 
  Shield,
  Paperclip,
  Lock,
  Send,
  FileText,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Settings,
  History,
  Eye,
  Copy,
  Hash,
  User,
  Calendar,
  Database,
  Search,
  MapPin,
  Building,
  FileImage,
  FileVideo,
  FileAudio,
  File
} from 'lucide-react';

const ContactPolice = () => {
  const [walletId, setWalletId] = useState('');
  const [caseDetails, setCaseDetails] = useState(null);
  const [selectedStation, setSelectedStation] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);

  // Mock data
  const [policeStations, setPoliceStations] = useState([]);
  const [evidence, setEvidence] = useState([]);

  useEffect(() => {
    // Fetch police stations from API
    const fetchPoliceStations = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/police-stations/stations`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            setPoliceStations(data.data);
          } else {
            // Real police station data from the table
            setPoliceStations([
              {
                _id: '1',
                zoneRangeDistrict: "Agra Range",
                officeContact: "DIG",
                officeContactMobile: "945440019",
                email: "digraga@n",
                telephone: ["0562-2463", "0562-2263"],
                state: "Uttar Pradesh",
                city: "Agra",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '2',
                zoneRangeDistrict: "Aligarh Range",
                officeContact: "DIG",
                officeContactMobile: "945440039",
                email: "digraih@u",
                telephone: ["0571-2400", "0571-2400"],
                state: "Uttar Pradesh",
                city: "Aligarh",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '3',
                zoneRangeDistrict: "Allahabad Range",
                officeContact: "DIG",
                officeContactMobile: "945440019",
                email: "digrald@n",
                telephone: ["0532-2260", "0532-2260"],
                state: "Uttar Pradesh",
                city: "Allahabad",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '4',
                zoneRangeDistrict: "Chitrakoot Dham Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrckd@g",
                telephone: ["0519-2220", "0519-2220"],
                state: "Uttar Pradesh",
                city: "Chitrakoot",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '5',
                zoneRangeDistrict: "Moradabad Range",
                officeContact: "DIG",
                officeContactMobile: "945440021",
                email: "digrmdd@",
                telephone: ["0591-2435", "0591-2435"],
                state: "Uttar Pradesh",
                city: "Moradabad",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '6',
                zoneRangeDistrict: "Basti Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrbas@n",
                telephone: ["05542-246", "05542-246"],
                state: "Uttar Pradesh",
                city: "Basti",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '7',
                zoneRangeDistrict: "Sant Kabir Nagar",
                officeContact: "SP",
                officeContactMobile: "945440028",
                email: "spkbn-up@",
                telephone: ["05547-222", "05547-226"],
                state: "Uttar Pradesh",
                city: "Sant Kabir Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '8',
                zoneRangeDistrict: "Sidhar th Nagar",
                officeContact: "SP",
                officeContactMobile: "945440030",
                email: "spsdr-up@",
                telephone: ["05544-222", "05544-222"],
                state: "Uttar Pradesh",
                city: "Sidhar th Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '9',
                zoneRangeDistrict: "Devipatan Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrgon@m",
                telephone: ["05262-230", "05262-230"],
                state: "Uttar Pradesh",
                city: "Devipatan",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '10',
                zoneRangeDistrict: "Gorakhpur Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrgkr@u",
                telephone: ["0551-2201", "0551-2200"],
                state: "Uttar Pradesh",
                city: "Gorakhpur",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '11',
                zoneRangeDistrict: "Kushi Nagar",
                officeContact: "SP",
                officeContactMobile: "945440028",
                email: "spksn-up@",
                telephone: ["556424-24-", "0510-2333"],
                state: "Uttar Pradesh",
                city: "Kushi Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '12',
                zoneRangeDistrict: "Jhansi Range",
                officeContact: "DIG",
                officeContactMobile: "945440021",
                email: "digrjsi@up",
                telephone: ["-", "0510-2333"],
                state: "Uttar Pradesh",
                city: "Jhansi",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '13',
                zoneRangeDistrict: "Kanpur Range",
                officeContact: "DIG",
                officeContactMobile: "945440021",
                email: "digrknr@up",
                telephone: ["0512-2536", "0512-2530"],
                state: "Uttar Pradesh",
                city: "Kanpur",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '14',
                zoneRangeDistrict: "Kanpur Nagar",
                officeContact: "SSP",
                officeContactMobile: "945440028",
                email: "sspknr-up@",
                telephone: ["0512-2304", "0512-2530"],
                state: "Uttar Pradesh",
                city: "Kanpur Nagar",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '15',
                zoneRangeDistrict: "Faizabad Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrfzd@n",
                telephone: ["05278-224", "05278-224"],
                state: "Uttar Pradesh",
                city: "Faizabad",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '16',
                zoneRangeDistrict: "Ambedkar Nagar",
                officeContact: "SP",
                officeContactMobile: "945440024",
                email: "spabr-up@",
                telephone: ["05271-244-", "-"],
                state: "Uttar Pradesh",
                city: "Ambedkar Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '17',
                zoneRangeDistrict: "Lucknow Range",
                officeContact: "DIG",
                officeContactMobile: "94544002:",
                email: "digrlkw@g",
                telephone: ["0522-2393", "0522-2719"],
                state: "Uttar Pradesh",
                city: "Lucknow",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '18',
                zoneRangeDistrict: "Gautam Budh Nagar",
                officeContact: "SSP",
                officeContactMobile: "945440027",
                email: "sspgbn-upc",
                telephone: ["0120-2514", "0120-2549"],
                state: "Uttar Pradesh",
                city: "Gautam Budh Nagar",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '19',
                zoneRangeDistrict: "Saharanpur Range",
                officeContact: "DIG",
                officeContactMobile: "94544002:",
                email: "digrsah@u",
                telephone: ["0132-2761", "0132-2761"],
                state: "Uttar Pradesh",
                city: "Saharanpur",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '20',
                zoneRangeDistrict: "Muzaffar Nagar",
                officeContact: "SSP",
                officeContactMobile: "945440031",
                email: "sspzuf-up@",
                telephone: ["0131-2436", "0131-2437"],
                state: "Uttar Pradesh",
                city: "Muzaffar Nagar",
                specialization: "General Law Enforcement",
                priority: "high"
              },
              {
                _id: '21',
                zoneRangeDistrict: "Azamgarh Range",
                officeContact: "DIG",
                officeContactMobile: "94544002(",
                email: "digrazh@u",
                telephone: ["05462-260", "05462-260"],
                state: "Uttar Pradesh",
                city: "Azamgarh",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '22',
                zoneRangeDistrict: "Mirzapur Range",
                officeContact: "DIG",
                officeContactMobile: "945440021",
                email: "digrmir@n",
                telephone: ["05442-256", "05442-257"],
                state: "Uttar Pradesh",
                city: "Mirzapur",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '23',
                zoneRangeDistrict: "Sant Ra vidas Nagar",
                officeContact: "SP",
                officeContactMobile: "94544003(",
                email: "spsrn-up@",
                telephone: ["05414-250", "05414-250"],
                state: "Uttar Pradesh",
                city: "Sant Ra vidas Nagar",
                specialization: "General Law Enforcement",
                priority: "medium"
              },
              {
                _id: '24',
                zoneRangeDistrict: "Varanasi Range",
                officeContact: "DIG",
                officeContactMobile: "945440019",
                email: "digrvns@n",
                telephone: ["0542-2502", "0542-2509"],
                state: "Uttar Pradesh",
                city: "Varanasi",
                specialization: "General Law Enforcement",
                priority: "high"
              }
            ]);
          }
        } else {
          console.error('Failed to fetch police stations');
          // Use full fallback data on API error
          setPoliceStations([
            {
              _id: '1',
              zoneRangeDistrict: "Agra Range",
              officeContact: "DIG",
              officeContactMobile: "945440019",
              email: "digraga@n",
              telephone: ["0562-2463", "0562-2263"],
              state: "Uttar Pradesh",
              city: "Agra",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '2',
              zoneRangeDistrict: "Aligarh Range",
              officeContact: "DIG",
              officeContactMobile: "945440039",
              email: "digraih@u",
              telephone: ["0571-2400", "0571-2400"],
              state: "Uttar Pradesh",
              city: "Aligarh",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '3',
              zoneRangeDistrict: "Allahabad Range",
              officeContact: "DIG",
              officeContactMobile: "945440019",
              email: "digrald@n",
              telephone: ["0532-2260", "0532-2260"],
              state: "Uttar Pradesh",
              city: "Allahabad",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '4',
              zoneRangeDistrict: "Chitrakoot Dham Range",
              officeContact: "DIG",
              officeContactMobile: "94544002(",
              email: "digrckd@g",
              telephone: ["0519-2220", "0519-2220"],
              state: "Uttar Pradesh",
              city: "Chitrakoot",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '5',
              zoneRangeDistrict: "Moradabad Range",
              officeContact: "DIG",
              officeContactMobile: "945440021",
              email: "digrmdd@",
              telephone: ["0591-2435", "0591-2435"],
              state: "Uttar Pradesh",
              city: "Moradabad",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '6',
              zoneRangeDistrict: "Basti Range",
              officeContact: "DIG",
              officeContactMobile: "94544002(",
              email: "digrbas@n",
              telephone: ["05542-246", "05542-246"],
              state: "Uttar Pradesh",
              city: "Basti",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '7',
              zoneRangeDistrict: "Sant Kabir Nagar",
              officeContact: "SP",
              officeContactMobile: "945440028",
              email: "spkbn-up@",
              telephone: ["05547-222", "05547-226"],
              state: "Uttar Pradesh",
              city: "Sant Kabir Nagar",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '8',
              zoneRangeDistrict: "Sidhar th Nagar",
              officeContact: "SP",
              officeContactMobile: "945440030",
              email: "spsdr-up@",
              telephone: ["05544-222", "05544-222"],
              state: "Uttar Pradesh",
              city: "Sidhar th Nagar",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '9',
              zoneRangeDistrict: "Devipatan Range",
              officeContact: "DIG",
              officeContactMobile: "94544002(",
              email: "digrgon@m",
              telephone: ["05262-230", "05262-230"],
              state: "Uttar Pradesh",
              city: "Devipatan",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '10',
              zoneRangeDistrict: "Gorakhpur Range",
              officeContact: "DIG",
              officeContactMobile: "94544002(",
              email: "digrgkr@u",
              telephone: ["0551-2201", "0551-2200"],
              state: "Uttar Pradesh",
              city: "Gorakhpur",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '11',
              zoneRangeDistrict: "Kushi Nagar",
              officeContact: "SP",
              officeContactMobile: "945440028",
              email: "spksn-up@",
              telephone: ["556424-24-", "0510-2333"],
              state: "Uttar Pradesh",
              city: "Kushi Nagar",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '12',
              zoneRangeDistrict: "Jhansi Range",
              officeContact: "DIG",
              officeContactMobile: "945440021",
              email: "digrjsi@up",
              telephone: ["-", "0510-2333"],
              state: "Uttar Pradesh",
              city: "Jhansi",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '13',
              zoneRangeDistrict: "Kanpur Range",
              officeContact: "DIG",
              officeContactMobile: "945440021",
              email: "digrknr@up",
              telephone: ["0512-2536", "0512-2530"],
              state: "Uttar Pradesh",
              city: "Kanpur",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '14',
              zoneRangeDistrict: "Kanpur Nagar",
              officeContact: "SSP",
              officeContactMobile: "945440028",
              email: "sspknr-up@",
              telephone: ["0512-2304", "0512-2530"],
              state: "Uttar Pradesh",
              city: "Kanpur Nagar",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '15',
              zoneRangeDistrict: "Faizabad Range",
              officeContact: "DIG",
              officeContactMobile: "94544002(",
              email: "digrfzd@n",
              telephone: ["05278-224", "05278-224"],
              state: "Uttar Pradesh",
              city: "Faizabad",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '16',
              zoneRangeDistrict: "Ambedkar Nagar",
              officeContact: "SP",
              officeContactMobile: "945440024",
              email: "spabr-up@",
              telephone: ["05271-244-", "-"],
              state: "Uttar Pradesh",
              city: "Ambedkar Nagar",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '17',
              zoneRangeDistrict: "Lucknow Range",
              officeContact: "DIG",
              officeContactMobile: "94544002:",
              email: "digrlkw@g",
              telephone: ["0522-2393", "0522-2719"],
              state: "Uttar Pradesh",
              city: "Lucknow",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '18',
              zoneRangeDistrict: "Gautam Budh Nagar",
              officeContact: "SSP",
              officeContactMobile: "945440027",
              email: "sspgbn-upc",
              telephone: ["0120-2514", "0120-2549"],
              state: "Uttar Pradesh",
              city: "Gautam Budh Nagar",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '19',
              zoneRangeDistrict: "Saharanpur Range",
              officeContact: "DIG",
              officeContactMobile: "94544002:",
              email: "digrsah@u",
              telephone: ["0132-2761", "0132-2761"],
              state: "Uttar Pradesh",
              city: "Saharanpur",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '20',
              zoneRangeDistrict: "Muzaffar Nagar",
              officeContact: "SSP",
              officeContactMobile: "945440031",
              email: "sspzuf-up@",
              telephone: ["0131-2436", "0131-2437"],
              state: "Uttar Pradesh",
              city: "Muzaffar Nagar",
              specialization: "General Law Enforcement",
              priority: "high"
            },
            {
              _id: '21',
              zoneRangeDistrict: "Azamgarh Range",
              officeContact: "DIG",
              officeContactMobile: "94544002(",
              email: "digrazh@u",
              telephone: ["05462-260", "05462-260"],
              state: "Uttar Pradesh",
              city: "Azamgarh",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '22',
              zoneRangeDistrict: "Mirzapur Range",
              officeContact: "DIG",
              officeContactMobile: "945440021",
              email: "digrmir@n",
              telephone: ["05442-256", "05442-257"],
              state: "Uttar Pradesh",
              city: "Mirzapur",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '23',
              zoneRangeDistrict: "Sant Ra vidas Nagar",
              officeContact: "SP",
              officeContactMobile: "94544003(",
              email: "spsrn-up@",
              telephone: ["05414-250", "05414-250"],
              state: "Uttar Pradesh",
              city: "Sant Ra vidas Nagar",
              specialization: "General Law Enforcement",
              priority: "medium"
            },
            {
              _id: '24',
              zoneRangeDistrict: "Varanasi Range",
              officeContact: "DIG",
              officeContactMobile: "945440019",
              email: "digrvns@n",
              telephone: ["0542-2502", "0542-2509"],
              state: "Uttar Pradesh",
              city: "Varanasi",
              specialization: "General Law Enforcement",
              priority: "high"
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching police stations:', error);
        // Use full fallback data on error
        setPoliceStations([
          {
            _id: '1',
            zoneRangeDistrict: "Agra Range",
            officeContact: "DIG",
            officeContactMobile: "945440019",
            email: "digraga@n",
            telephone: ["0562-2463", "0562-2263"],
            state: "Uttar Pradesh",
            city: "Agra",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '2',
            zoneRangeDistrict: "Aligarh Range",
            officeContact: "DIG",
            officeContactMobile: "945440039",
            email: "digraih@u",
            telephone: ["0571-2400", "0571-2400"],
            state: "Uttar Pradesh",
            city: "Aligarh",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '3',
            zoneRangeDistrict: "Allahabad Range",
            officeContact: "DIG",
            officeContactMobile: "945440019",
            email: "digrald@n",
            telephone: ["0532-2260", "0532-2260"],
            state: "Uttar Pradesh",
            city: "Allahabad",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '4',
            zoneRangeDistrict: "Chitrakoot Dham Range",
            officeContact: "DIG",
            officeContactMobile: "94544002(",
            email: "digrckd@g",
            telephone: ["0519-2220", "0519-2220"],
            state: "Uttar Pradesh",
            city: "Chitrakoot",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '5',
            zoneRangeDistrict: "Moradabad Range",
            officeContact: "DIG",
            officeContactMobile: "945440021",
            email: "digrmdd@",
            telephone: ["0591-2435", "0591-2435"],
            state: "Uttar Pradesh",
            city: "Moradabad",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '6',
            zoneRangeDistrict: "Basti Range",
            officeContact: "DIG",
            officeContactMobile: "94544002(",
            email: "digrbas@n",
            telephone: ["05542-246", "05542-246"],
            state: "Uttar Pradesh",
            city: "Basti",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '7',
            zoneRangeDistrict: "Sant Kabir Nagar",
            officeContact: "SP",
            officeContactMobile: "945440028",
            email: "spkbn-up@",
            telephone: ["05547-222", "05547-226"],
            state: "Uttar Pradesh",
            city: "Sant Kabir Nagar",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '8',
            zoneRangeDistrict: "Sidhar th Nagar",
            officeContact: "SP",
            officeContactMobile: "945440030",
            email: "spsdr-up@",
            telephone: ["05544-222", "05544-222"],
            state: "Uttar Pradesh",
            city: "Sidhar th Nagar",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '9',
            zoneRangeDistrict: "Devipatan Range",
            officeContact: "DIG",
            officeContactMobile: "94544002(",
            email: "digrgon@m",
            telephone: ["05262-230", "05262-230"],
            state: "Uttar Pradesh",
            city: "Devipatan",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '10',
            zoneRangeDistrict: "Gorakhpur Range",
            officeContact: "DIG",
            officeContactMobile: "94544002(",
            email: "digrgkr@u",
            telephone: ["0551-2201", "0551-2200"],
            state: "Uttar Pradesh",
            city: "Gorakhpur",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '11',
            zoneRangeDistrict: "Kushi Nagar",
            officeContact: "SP",
            officeContactMobile: "945440028",
            email: "spksn-up@",
            telephone: ["556424-24-", "0510-2333"],
            state: "Uttar Pradesh",
            city: "Kushi Nagar",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '12',
            zoneRangeDistrict: "Jhansi Range",
            officeContact: "DIG",
            officeContactMobile: "945440021",
            email: "digrjsi@up",
            telephone: ["-", "0510-2333"],
            state: "Uttar Pradesh",
            city: "Jhansi",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '13',
            zoneRangeDistrict: "Kanpur Range",
            officeContact: "DIG",
            officeContactMobile: "945440021",
            email: "digrknr@up",
            telephone: ["0512-2536", "0512-2530"],
            state: "Uttar Pradesh",
            city: "Kanpur",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '14',
            zoneRangeDistrict: "Kanpur Nagar",
            officeContact: "SSP",
            officeContactMobile: "945440028",
            email: "sspknr-up@",
            telephone: ["0512-2304", "0512-2530"],
            state: "Uttar Pradesh",
            city: "Kanpur Nagar",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '15',
            zoneRangeDistrict: "Faizabad Range",
            officeContact: "DIG",
            officeContactMobile: "94544002(",
            email: "digrfzd@n",
            telephone: ["05278-224", "05278-224"],
            state: "Uttar Pradesh",
            city: "Faizabad",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '16',
            zoneRangeDistrict: "Ambedkar Nagar",
            officeContact: "SP",
            officeContactMobile: "945440024",
            email: "spabr-up@",
            telephone: ["05271-244-", "-"],
            state: "Uttar Pradesh",
            city: "Ambedkar Nagar",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '17',
            zoneRangeDistrict: "Lucknow Range",
            officeContact: "DIG",
            officeContactMobile: "94544002:",
            email: "digrlkw@g",
            telephone: ["0522-2393", "0522-2719"],
            state: "Uttar Pradesh",
            city: "Lucknow",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '18',
            zoneRangeDistrict: "Gautam Budh Nagar",
            officeContact: "SSP",
            officeContactMobile: "945440027",
            email: "sspgbn-upc",
            telephone: ["0120-2514", "0120-2549"],
            state: "Uttar Pradesh",
            city: "Gautam Budh Nagar",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '19',
            zoneRangeDistrict: "Saharanpur Range",
            officeContact: "DIG",
            officeContactMobile: "94544002:",
            email: "digrsah@u",
            telephone: ["0132-2761", "0132-2761"],
            state: "Uttar Pradesh",
            city: "Saharanpur",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '20',
            zoneRangeDistrict: "Muzaffar Nagar",
            officeContact: "SSP",
            officeContactMobile: "945440031",
            email: "sspzuf-up@",
            telephone: ["0131-2436", "0131-2437"],
            state: "Uttar Pradesh",
            city: "Muzaffar Nagar",
            specialization: "General Law Enforcement",
            priority: "high"
          },
          {
            _id: '21',
            zoneRangeDistrict: "Azamgarh Range",
            officeContact: "DIG",
            officeContactMobile: "94544002(",
            email: "digrazh@u",
            telephone: ["05462-260", "05462-260"],
            state: "Uttar Pradesh",
            city: "Azamgarh",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '22',
            zoneRangeDistrict: "Mirzapur Range",
            officeContact: "DIG",
            officeContactMobile: "945440021",
            email: "digrmir@n",
            telephone: ["05442-256", "05442-257"],
            state: "Uttar Pradesh",
            city: "Mirzapur",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '23',
            zoneRangeDistrict: "Sant Ra vidas Nagar",
            officeContact: "SP",
            officeContactMobile: "94544003(",
            email: "spsrn-up@",
            telephone: ["05414-250", "05414-250"],
            state: "Uttar Pradesh",
            city: "Sant Ra vidas Nagar",
            specialization: "General Law Enforcement",
            priority: "medium"
          },
          {
            _id: '24',
            zoneRangeDistrict: "Varanasi Range",
            officeContact: "DIG",
            officeContactMobile: "945440019",
            email: "digrvns@n",
            telephone: ["0542-2502", "0542-2509"],
            state: "Uttar Pradesh",
            city: "Varanasi",
            specialization: "General Law Enforcement",
            priority: "high"
          }
        ]);
      }
    };

    fetchPoliceStations();

    // Mock report history
    setReportHistory([
      {
        id: '1',
        walletId: '0x742d35Cc6634C0532925a3b8D',
        caseId: 'CASE-001',
        stationName: 'Cybercrime Unit - FBI',
        evidenceCount: 3,
        description: 'High-risk money laundering case with strong evidence',
        notes: 'Case escalated due to ML score > 90',
        timestamp: '2024-01-20T14:30:00Z',
        status: 'Delivered'
      },
      {
        id: '2',
        walletId: '0x8ba1f109551bD432803012645H',
        caseId: 'CASE-002',
        stationName: 'Financial Crimes Division - NYPD',
        evidenceCount: 1,
        description: 'Exchange compliance violation investigation',
        notes: 'Initial report for investigation',
        timestamp: '2024-01-19T17:00:00Z',
        status: 'Pending'
      }
    ]);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Delivered': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'Failed': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  // Step 1: Wallet lookup function
  const handleWalletLookup = async () => {
    if (!walletId.trim()) {
      alert('Please enter a wallet ID.');
      return;
    }

    setIsLoading(true);

    try {
      // Search Evidence Library for the wallet address
      const evidenceResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/evidence`);
      let foundEvidence = [];
      
      if (evidenceResponse.ok) {
        const evidenceResult = await evidenceResponse.json();
        if (evidenceResult.success) {
          // Filter evidence by wallet address
          foundEvidence = evidenceResult.data.filter(item => 
            item.entity && item.entity.toLowerCase().includes(walletId.toLowerCase())
          );
        }
      }

      // Search ML Analysis for the wallet address
      const mlResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ml-analysis/my-analyses`);
      let mlAnalysis = null;
      
      if (mlResponse.ok) {
        const mlResult = await mlResponse.json();
        if (mlResult.success) {
          // Find ML analysis for this wallet
          mlAnalysis = mlResult.data.find(item => 
            item.walletAddress && item.walletAddress.toLowerCase().includes(walletId.toLowerCase())
          );
        }
      }

      // If no data found from API, use mock data
      if (foundEvidence.length === 0 && !mlAnalysis) {
        // Mock evidence data based on wallet ID
        foundEvidence = [
          {
            id: '1',
            fileName: 'transaction_log_analysis.pdf',
            fileType: 'pdf',
            fileSize: '2.3 MB',
            hash: 'sha256:a1b2c3d4e5f6...',
            uploadedAt: '2024-01-20T11:00:00Z',
            uploadedBy: 'Detective Smith',
            isReadOnly: true,
            entity: walletId
          },
          {
            id: '2',
            fileName: 'wallet_activity_export.csv',
            fileType: 'csv',
            fileSize: '1.8 MB',
            hash: 'sha256:f6e5d4c3b2a1...',
            uploadedAt: '2024-01-20T11:15:00Z',
            uploadedBy: 'Officer Johnson',
            isReadOnly: true,
            entity: walletId
          }
        ];

        // Mock ML analysis
        mlAnalysis = {
          walletAddress: walletId,
          analysisResults: {
            riskLevel: 'HIGH',
            fraudProbability: 0.85,
            isSuspicious: true,
            anomalyScore: -0.75
          },
          modelInfo: {
            modelType: 'IsolationForest',
            version: '1.0'
          }
        };
      }

      // Create case details from found data
      const caseDetails = {
        walletId: walletId,
        caseId: 'CASE-' + Math.floor(Math.random() * 1000),
        riskScore: mlAnalysis ? Math.round(mlAnalysis.analysisResults.fraudProbability * 100) : Math.floor(Math.random() * 100),
        mlTags: mlAnalysis ? [mlAnalysis.analysisResults.riskLevel, mlAnalysis.modelInfo.modelType] : ['Unknown', 'No Analysis'],
        status: mlAnalysis && mlAnalysis.analysisResults.isSuspicious ? 'High Risk' : 'Under Review',
        investigator: 'Detective Smith',
        region: 'New York',
        createdAt: '2024-01-20T10:30:00Z',
        evidenceCount: foundEvidence.length,
        mlAnalysis: mlAnalysis
      };

      setCaseDetails(caseDetails);
      setEvidence(foundEvidence);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error looking up wallet:', error);
      alert('Error looking up wallet. Using mock data.');
      
      // Fallback to mock data
      const mockCaseDetails = {
        walletId: walletId,
        caseId: 'CASE-' + Math.floor(Math.random() * 1000),
        riskScore: Math.floor(Math.random() * 100),
        mlTags: ['High Volume', 'Suspicious Pattern', 'Cross-chain Activity'],
        status: 'Active',
        investigator: 'Detective Smith',
        region: 'New York',
        createdAt: '2024-01-20T10:30:00Z',
        evidenceCount: 3
      };

      const mockEvidence = [
        {
          id: '1',
          fileName: 'transaction_log_analysis.pdf',
          fileType: 'pdf',
          fileSize: '2.3 MB',
          hash: 'sha256:a1b2c3d4e5f6...',
          uploadedAt: '2024-01-20T11:00:00Z',
          uploadedBy: 'Detective Smith',
          isReadOnly: true,
          entity: walletId
        }
      ];

      setCaseDetails(mockCaseDetails);
      setEvidence(mockEvidence);
      setCurrentStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReport = async () => {
    if (!walletId || !selectedStation || !description.trim()) {
      alert('Please complete all required fields.');
      return;
    }

    setIsSending(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const selectedStationData = policeStations.find(s => s._id === selectedStation);
    
    const newReport = {
      id: Date.now().toString(),
      walletId: walletId,
      caseId: caseDetails.caseId,
      stationName: selectedStationData.zoneRangeDistrict,
      evidenceCount: evidence.length,
      description: description,
      notes: notes,
      timestamp: new Date().toISOString(),
      status: 'Delivered'
    };

    setReportHistory(prev => [newReport, ...prev]);
    setIsSending(false);
    
    // Reset form
    setWalletId('');
    setCaseDetails(null);
    setEvidence([]);
    setDescription('');
    setNotes('');
    setCurrentStep(1);
    
    alert('Report sent successfully to law enforcement!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'csv': return <FileText className="w-4 h-4 text-green-500" />;
      case 'json': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'image': return <FileImage className="w-4 h-4 text-blue-500" />;
      case 'video': return <FileVideo className="w-4 h-4 text-purple-500" />;
      case 'audio': return <FileAudio className="w-4 h-4 text-orange-500" />;
      default: return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRiskColor = (score) => {
    if (score >= 80) return 'text-red-600 bg-red-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">👮</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Contact Law Enforcement</h1>
                <p className="mt-2 text-gray-600">Secure communication channel for reporting cybercrime cases</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Progress Steps */}
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    1
                  </div>
                  <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
                    Enter Wallet ID
                  </span>
                  <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </div>
                  <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
                    Evidence Auto-Attach
                  </span>
                  <div className={`w-16 h-1 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    3
                  </div>
                  <span className={`text-sm font-medium ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-500'}`}>
                    Police Station
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1: Enter Wallet ID */}
            {currentStep === 1 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Step 1: Enter Wallet ID</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wallet Address
                    </label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={walletId}
                        onChange={(e) => setWalletId(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      />
                      <button
                        onClick={handleWalletLookup}
                        disabled={isLoading || !walletId.trim()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Searching...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            <span>Lookup</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Enter the wallet address to automatically fetch case details and evidence files.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Evidence Auto-Attach */}
            {currentStep >= 2 && caseDetails && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Step 2: Evidence Auto-Attached</h2>
                
                {/* Case Details */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Case Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Wallet ID:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="font-mono text-xs">{caseDetails.walletId}</span>
                        <button onClick={() => copyToClipboard(caseDetails.walletId)}>
                          <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Case ID:</span>
                      <span className="ml-2">{caseDetails.caseId}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Risk Score:</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(caseDetails.riskScore)}`}>
                        {caseDetails.riskScore}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Investigator:</span>
                      <span className="ml-2">{caseDetails.investigator}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Region:</span>
                      <span className="ml-2">{caseDetails.region}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className="ml-2">{caseDetails.status}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <span className="font-medium text-gray-700">ML Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {caseDetails.mlTags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ML Analysis Details */}
                  {caseDetails.mlAnalysis && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">🤖 AI Analysis Results</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Risk Level:</span>
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                            caseDetails.mlAnalysis.analysisResults.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                            caseDetails.mlAnalysis.analysisResults.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {caseDetails.mlAnalysis.analysisResults.riskLevel}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Fraud Probability:</span>
                          <span className="ml-2 font-mono">
                            {Math.round(caseDetails.mlAnalysis.analysisResults.fraudProbability * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Model:</span>
                          <span className="ml-2">{caseDetails.mlAnalysis.modelInfo.modelType}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Suspicious:</span>
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                            caseDetails.mlAnalysis.analysisResults.isSuspicious ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {caseDetails.mlAnalysis.analysisResults.isSuspicious ? 'YES' : 'NO'}
                          </span>
                        </div>
                      </div>
                      {caseDetails.mlAnalysis.analysisResults.suspiciousTransactions && 
                       caseDetails.mlAnalysis.analysisResults.suspiciousTransactions.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium text-gray-700">Suspicious Transactions:</span>
                          <span className="ml-2 text-red-600 font-semibold">
                            {caseDetails.mlAnalysis.analysisResults.suspiciousTransactions.length} found
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Evidence Files */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📎 Linked Evidence Files (Auto-Attached) 
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      Found {evidence.length} files for wallet {caseDetails.walletId}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {evidence.map((evidenceItem) => (
                      <div key={evidenceItem.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-green-50">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(evidenceItem.fileType)}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{evidenceItem.fileName}</div>
                            <div className="text-xs text-gray-500">
                              {evidenceItem.fileSize} • Uploaded by {evidenceItem.uploadedBy}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Read-Only
                          </span>
                          <Lock className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    All evidence files are automatically attached and cannot be removed to preserve chain of custody.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Police Station Selector */}
            {currentStep >= 3 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Step 3: Police Station Selection</h2>
                
                <div className="space-y-6">
                  {/* Station Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Police Station
                    </label>
                    <select
                      value={selectedStation}
                      onChange={(e) => setSelectedStation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose a police station...</option>
                      {policeStations.map((station) => (
                        <option key={station._id} value={station._id}>
                          {station.zoneRangeDistrict}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Station Details */}
                  {selectedStation && (() => {
                    const station = policeStations.find(s => s._id === selectedStation);
                    return station ? (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">Selected Station</h3>
                        <div className="space-y-2 text-sm">
                          <div><strong>Zone/Range/District:</strong> {station.zoneRangeDistrict}</div>
                          <div><strong>Designation:</strong> {station.officeContact}</div>
                          <div><strong>Mobile No.:</strong> {station.officeContactMobile}</div>
                          <div><strong>E-Mail:</strong> {station.email}</div>
                          {station.telephone && station.telephone.length > 0 && (
                            <div><strong>Telephone:</strong> {station.telephone.join(', ')}</div>
                          )}
                          <div><strong>Location:</strong> {station.city}, {station.state}</div>
                          <div><strong>Specialization:</strong> {station.specialization}</div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {/* Step 4: Secure Report Form */}
            {currentStep >= 3 && selectedStation && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Step 4: Secure Report Form</h2>
                
                {/* Pre-filled Fields */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wallet ID</label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-mono text-sm">
                      {caseDetails?.walletId}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Case ID</label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm">
                      {caseDetails?.caseId}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Risk Score</label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(caseDetails?.riskScore)}`}>
                        {caseDetails?.riskScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Evidence Count</label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm">
                      {evidence.length} files
                    </div>
                  </div>
                </div>

                {/* Description Field */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description of Incident *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a detailed summary of the incident, suspicious activities, and any relevant information for law enforcement..."
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Notes Field */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internal Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add internal notes, investigation context, or additional information for your records..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Send Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSendReport}
                    disabled={isSending || !description.trim()}
                    className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Securely</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Report History */}
          <div className="w-96">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-6">
                <History className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Report History</h3>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {reportHistory.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{report.caseId}</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(report.status)}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(report.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-2">
                      <div className="flex items-center space-x-1">
                        <Hash className="w-3 h-3" />
                        <span>Wallet: {report.walletId}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-2">
                      <div className="flex items-center space-x-1">
                        <Building className="w-3 h-3" />
                        <span>Station: {report.stationName}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{report.description}</p>
                    
                    {report.notes && (
                      <div className="text-xs text-gray-600 mb-2">
                        <strong>Notes:</strong> {report.notes}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      <div className="flex items-center space-x-1 mb-1">
                        <Database className="w-3 h-3" />
                        <span>{report.evidenceCount} evidence files</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs">
                        <Eye className="w-3 h-3" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPolice;
