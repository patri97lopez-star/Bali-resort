import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Compass, Utensils, Car, ShieldCheck, Send, Loader2, Menu, X, ChevronRight, Activity as ActivityIcon, LogOut, User as UserIcon, Calendar, CloudSun, Languages, Banknote, Map as MapIcon, Star, Clock, Moon, Music, Waves, Flower2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chat } from './services/geminiService';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { AuthModal } from './components/AuthModal';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Reservation {
  id: string;
  serviceType: string;
  serviceName: string;
  status: string;
  createdAt: Timestamp;
}

interface Restaurant {
  name: string;
  location: string;
  description: string;
  specialty: string;
  image: string;
  url?: string;
  googleMapsUrl?: string;
}

interface Experience {
  title: string;
  category: string;
  description: string;
  highlight: string;
  image: string;
  url?: string;
  googleMapsUrl?: string;
}

interface Villa {
  name: string;
  location: string;
  description: string;
  amenities: string[];
  image: string;
  url?: string;
  googleMapsUrl?: string;
}

interface Activity {
  name: string;
  category: 'Senderismo' | 'Yoga' | 'Pilates';
  location: string;
  description: string;
  highlight: string;
  image: string;
  url?: string;
  googleMapsUrl?: string;
}

interface Transport {
  name: string;
  type: string;
  description: string;
  priceRange: string;
  image: string;
  url?: string;
  googleMapsUrl?: string;
}

const LUXURY_VILLAS: Villa[] = [
  {
    name: "Mandapa, a Ritz-Carlton Reserve",
    location: "Ubud",
    description: "Villas de lujo situadas a lo largo del río Ayung, rodeadas de exuberantes campos de arroz y selva tropical.",
    amenities: ["Piscina Privada", "Mayordomo 24h", "Spa de Clase Mundial"],
    image: "https://picsum.photos/seed/mandapa/800/600",
    url: "https://www.ritzcarlton.com/en/hotels/indonesia/mandapa",
    googleMapsUrl: "https://www.google.com/maps/place/Mandapa,+a+Ritz-Carlton+Reserve"
  },
  {
    name: "Bulgari Resort Bali",
    location: "Uluwatu",
    description: "Una fusión sofisticada de estilo balinés tradicional y diseño italiano contemporáneo, ubicado en un impresionante acantilado a 150 metros sobre el nivel del mar.",
    amenities: ["Playa Privada", "Ascensor Inclinado", "Restaurante Il Ristorante"],
    image: "https://picsum.photos/seed/bulgari/800/600",
    url: "https://www.bulgarihotels.com/en_US/bali",
    googleMapsUrl: "https://www.google.com/maps/place/Bulgari+Resort+Bali"
  },
  {
    name: "Four Seasons Resort Bali at Sayan",
    location: "Ubud",
    description: "Un santuario arquitectónico en el valle del río Ayung, accesible a través de un puente colgante sobre las copas de los árboles.",
    amenities: ["Arquitectura Icónica", "Yoga en el Loto", "Cenas Privadas en el Río"],
    image: "https://picsum.photos/seed/fourseasons/800/600",
    url: "https://www.fourseasons.com/sayan/",
    googleMapsUrl: "https://www.google.com/maps/place/Four+Seasons+Resort+Bali+At+Sayan"
  },
  {
    name: "Alila Villas Uluwatu",
    location: "Uluwatu",
    description: "Diseño minimalista y sostenible en la cima de un acantilado, famoso por su icónica cabaña de relajación sobre el abismo.",
    amenities: ["Diseño Eco-Luxe", "Piscina de 50m", "Servicio de Conserjería Personalizado"],
    image: "https://picsum.photos/seed/alila/800/600",
    url: "https://www.alilahotels.com/uluwatu",
    googleMapsUrl: "https://www.google.com/maps/place/Alila+Villas+Uluwatu"
  }
];

const PREMIUM_EXPERIENCES: Experience[] = [
  {
    title: "Bendición Privada con Pedanda",
    category: "Espiritual",
    description: "Un encuentro sagrado con un alto sacerdote balinés en la intimidad de su villa o en un templo remoto. Una ceremonia de purificación del alma y alineación energética.",
    highlight: "Acceso exclusivo a rituales ancestrales",
    image: "https://picsum.photos/seed/blessing/800/600",
    googleMapsUrl: "https://www.google.com/maps/search/pedanda+blessing+bali"
  },
  {
    title: "Besakih: El Templo Madre VIP",
    category: "Tours Privados",
    description: "Visita al complejo de templos más grande de Bali después del horario de cierre. Explore la majestuosidad de Besakih sin multitudes, bajo la luz del atardecer.",
    highlight: "Guía historiador privado y acceso a zonas restringidas",
    image: "https://picsum.photos/seed/besakih/800/600",
    googleMapsUrl: "https://www.google.com/maps/place/Besakih+Great+Temple"
  },
  {
    title: "Purificación en Tirta Empul",
    category: "Espiritual",
    description: "Ritual de limpieza en las fuentes sagradas antes del amanecer. Una experiencia de serenidad absoluta antes de que el templo abra al público general.",
    highlight: "Sesión privada de meditación con un monje",
    image: "https://picsum.photos/seed/purification/800/600",
    googleMapsUrl: "https://www.google.com/maps/place/Pura+Tirta+Empul"
  },
  {
    title: "Helitour: El Corazón del Volcán",
    category: "Tours Privados",
    description: "Sobrevuele el Monte Agung y las terrazas de arroz de Jatiluwih en un helicóptero privado. La perspectiva más dramática y exclusiva de la geografía sagrada de Bali.",
    highlight: "Vistas panorámicas de 360° y aterrizaje en paraje remoto",
    image: "https://picsum.photos/seed/helicopter/800/600",
    googleMapsUrl: "https://www.google.com/maps/place/Mount+Agung"
  },
  {
    title: "Tanah Lot al Anochecer",
    category: "Tours Privados",
    description: "Acceso privilegiado a las terrazas privadas frente al templo para contemplar el atardecer más icónico de Bali con servicio de canapés y champagne.",
    highlight: "Ubicación exclusiva lejos de las zonas turísticas",
    image: "https://picsum.photos/seed/tanahlot/800/600",
    googleMapsUrl: "https://www.google.com/maps/place/Pura+Tanah+Lot"
  },
  {
    title: "Transporte de Clase Ejecutiva VIP",
    category: "Transporte",
    description: "Traslados privados en vehículos de gama alta (Toyota Alphard) con conductores bilingües certificados. Incluye servicio de VIP Fast Track en el aeropuerto para evitar colas de inmigración.",
    highlight: "Servicio de conserjería a bordo y Fast Track incluido",
    image: "https://picsum.photos/seed/alphard/800/600",
    googleMapsUrl: "https://www.google.com/maps/place/Ngurah+Rai+International+Airport"
  }
];

const LUXURY_RESTAURANTS: Restaurant[] = [
  {
    name: "Locavore NXT",
    location: "Ubud",
    description: "Un manifiesto culinario de sostenibilidad radical. Ingredientes 100% locales transformados con técnicas de vanguardia.",
    specialty: "Menú Degustación Estacional",
    image: "https://picsum.photos/seed/locavore/800/600",
    url: "https://www.locavorenext.com/",
    googleMapsUrl: "https://www.google.com/maps/place/Locavore+NXT"
  },
  {
    name: "Apéritif",
    location: "Ubud",
    description: "Elegancia colonial de los años 20. Una experiencia de etiqueta con maridaje de vinos excepcional en una mansión majestuosa.",
    specialty: "Cocina de Autor Global",
    image: "https://picsum.photos/seed/aperitif/800/600",
    url: "https://www.aperitif.com/",
    googleMapsUrl: "https://www.google.com/maps/place/Ap%C3%A9ritif+Restaurant+%26+Bar"
  },
  {
    name: "Mozaic",
    location: "Ubud",
    description: "Gastronomía franco-indonesia pionera. Un oasis de serenidad en un jardín tropical privado.",
    specialty: "Fusión de Sabores Locales y Técnicas Francesas",
    image: "https://picsum.photos/seed/mozaic/800/600",
    url: "https://www.mozaic-bali.com/",
    googleMapsUrl: "https://www.google.com/maps/place/Mozaic+Restaurant"
  },
  {
    name: "El Kabron",
    location: "Uluwatu",
    description: "Sofisticación sobre el abismo. La mejor cocina española refinada con vistas inigualables al atardecer.",
    specialty: "Mariscos y Paellas de Autor",
    image: "https://picsum.photos/seed/elkabron/800/600",
    url: "https://elkabron.com/",
    googleMapsUrl: "https://www.google.com/maps/place/El+Kabron+Spanish+Restaurant+%26+Cliff+Club"
  },
  {
    name: "Savaya",
    location: "Uluwatu",
    description: "Exclusividad en los acantilados. Un destino de estilo de vida con servicio de mesa privado y vistas infinitas al Índico.",
    specialty: "Mixología Premium y Tapas de Lujo",
    image: "https://picsum.photos/seed/savaya/800/600",
    url: "https://www.savaya.com/",
    googleMapsUrl: "https://www.google.com/maps/place/Savaya+Bali"
  },
  {
    name: "Rock Bar",
    location: "Jimbaran",
    description: "Icono mundial del lujo. Ubicado sobre formaciones rocosas naturales con el sonido del mar como banda sonora.",
    specialty: "Cócteles de Autor y Vistas al Océano",
    image: "https://picsum.photos/seed/rockbar/800/600",
    url: "https://www.ayana.com/bali/ayana-resort-and-spa/dining/rock-bar-bali",
    googleMapsUrl: "https://www.google.com/maps/place/Rock+Bar"
  },
  {
    name: "Koral",
    location: "Nusa Dua",
    description: "El primer restaurante acuático de Bali. Una experiencia inmersiva bajo el mar con cocina bistronómica de primer nivel.",
    specialty: "Degustación de Mariscos Gourmet",
    image: "https://picsum.photos/seed/koral/800/600",
    url: "https://www.kempinski.com/en/bali/the-luxury-collection/dining/koral-restaurant/",
    googleMapsUrl: "https://www.google.com/maps/place/Koral+Restaurant"
  },
  {
    name: "Sardine",
    location: "Seminyak",
    description: "Cenas frente a los campos de arroz. Un entorno rústico-elegante especializado en productos frescos del mar y vegetales orgánicos.",
    specialty: "Pescado del Día a la Parrilla",
    image: "https://picsum.photos/seed/sardine/800/600",
    url: "https://www.sardinebali.com/",
    googleMapsUrl: "https://www.google.com/maps/place/Sardine+by+Kauri"
  },
  {
    name: "Private Villa Dining",
    location: "Ubud / Uluwatu",
    description: "La máxima expresión de la privacidad. Un chef personal diseña un menú exclusivo servido en la intimidad de su propia villa.",
    specialty: "Menú Personalizado a Medida",
    image: "https://picsum.photos/seed/privatevilla/800/600",
    googleMapsUrl: "https://www.google.com/maps/search/private+chef+bali"
  }
];

const OUTDOOR_ACTIVITIES: Activity[] = [
  {
    name: "Campuhan Ridge Walk",
    category: "Senderismo",
    location: "Ubud",
    description: "Una caminata escénica por la cresta de una colina que ofrece vistas impresionantes de la selva y los valles fluviales.",
    highlight: "Vistas panorámicas al atardecer",
    image: "https://picsum.photos/seed/campuhan/800/600",
    url: "https://www.tripadvisor.com/Attraction_Review-g297697-d4469792-Reviews-Campuhan_Ridge_Walk-Ubud_Gianyar_Regency_Bali.html",
    googleMapsUrl: "https://www.google.com/maps/place/Campuhan+Ridge+Walk"
  },
  {
    name: "Trekking al Monte Batur",
    category: "Senderismo",
    location: "Kintamani",
    description: "Ascenso guiado a la cima de un volcán activo para presenciar el amanecer más espectacular de la isla.",
    highlight: "Desayuno cocinado con vapor volcánico",
    image: "https://picsum.photos/seed/batur/800/600",
    url: "https://www.tripadvisor.com/Attraction_Review-g297696-d647367-Reviews-Mount_Batur-Kintamani_Bangli_Regency_Bali.html",
    googleMapsUrl: "https://www.google.com/maps/place/Mount+Batur"
  },
  {
    name: "The Yoga Barn",
    category: "Yoga",
    location: "Ubud",
    description: "Un centro de bienestar de renombre mundial que ofrece clases de yoga en estudios abiertos rodeados de vegetación tropical.",
    highlight: "Ambiente espiritual y comunidad global",
    image: "https://picsum.photos/seed/yogabarn/800/600",
    url: "https://www.theyogabarn.com/",
    googleMapsUrl: "https://www.google.com/maps/place/The+Yoga+Barn"
  },
  {
    name: "Desa Seni Village Resort",
    category: "Yoga",
    location: "Canggu",
    description: "Yoga en un entorno de aldea tradicional con casas antiguas de madera y jardines orgánicos.",
    highlight: "Clases de Hatha y Vinyasa al aire libre",
    image: "https://picsum.photos/seed/desaseni/800/600",
    url: "https://www.desaseni.com/",
    googleMapsUrl: "https://www.google.com/maps/place/Desa+Seni+A+Village+Resort"
  },
  {
    name: "The Pilates Studio Bali",
    category: "Pilates",
    location: "Berawa",
    description: "Estudio boutique especializado en Pilates Reformer y Mat con instructores certificados internacionalmente.",
    highlight: "Equipamiento de última generación y atención personalizada",
    image: "https://picsum.photos/seed/pilatesbali/800/600",
    url: "https://www.thepilatesstudiobali.com/",
    googleMapsUrl: "https://www.google.com/maps/place/The+Pilates+Studio+Bali"
  },
  {
    name: "Sunset Pilates Bali",
    category: "Pilates",
    location: "Seminyak",
    description: "Sesiones de pilates enfocadas en la fuerza y flexibilidad en un espacio moderno y luminoso.",
    highlight: "Vistas al atardecer durante las sesiones de tarde",
    image: "https://picsum.photos/seed/sunsetpilates/800/600",
    url: "http://sunsetpilatesbali.com/",
    googleMapsUrl: "https://www.google.com/maps/place/Sunset+Pilates+Bali"
  }
];

const TRANSPORT_OPTIONS: Transport[] = [
  {
    name: "Blue Bird Taxi",
    type: "Taxi Estándar",
    description: "El servicio de taxi más confiable de Bali con taxímetro. Ideal para trayectos cortos y urbanos.",
    priceRange: "Económico",
    image: "https://picsum.photos/seed/bluebird/800/600",
    url: "https://www.bluebirdgroup.com/"
  },
  {
    name: "Luxury Private Car",
    type: "Chófer Privado",
    description: "Vehículo de alta gama (Toyota Alphard o similar) con conductor bilingüe a su disposición por 8-12 horas.",
    priceRange: "Premium",
    image: "https://picsum.photos/seed/luxurycar/800/600",
    url: "https://www.baligoldenconcierge.com/"
  },
  {
    name: "Scooter Rental",
    type: "Moto",
    description: "La forma más rápida de moverse por el tráfico de Bali. Scooters modernas de 125cc o 150cc entregadas en su villa.",
    priceRange: "Económico",
    image: "https://picsum.photos/seed/scooter/800/600",
    url: "https://www.bikago.com/scooter-rental-bali/"
  },
  {
    name: "Helicopter Transfer",
    type: "Aéreo",
    description: "Traslados rápidos entre el aeropuerto y las zonas más exclusivas, o tours panorámicos sobre los volcanes.",
    priceRange: "Ultra Lujo",
    image: "https://picsum.photos/seed/helicopter/800/600",
    url: "https://www.baliadventuretours.com/helicopter-tours/"
  }
];

const HIDDEN_TREASURES = [
  { 
    name: 'Playa de Nyang Nyang', 
    loc: 'Uluwatu', 
    desc: '500 escalones hacia la libertad absoluta. Arena virgen y restos de barcos.', 
    icon: <Star size={14} />, 
    mapUrl: 'https://www.google.com/maps/place/Nyang+Nyang+Beach',
    x: 410,
    y: 465
  },
  { 
    name: 'Cueva de Meditación', 
    loc: 'Ubud', 
    desc: 'Acceso solo a través de una cascada oculta. Paz total.', 
    icon: <Star size={14} />, 
    mapUrl: 'https://www.google.com/maps/search/secret+cave+ubud',
    x: 380,
    y: 210
  },
  { 
    name: 'Mercado Nocturno Sidemen', 
    loc: 'East Bali', 
    desc: 'Sabor auténtico sin un solo turista a la vista.', 
    icon: <Star size={14} />, 
    mapUrl: 'https://www.google.com/maps/place/Sidemen,+Karangasem+Regency,+Bali',
    x: 600,
    y: 280
  },
  { 
    name: 'Mirador del Volcán Olvidado', 
    loc: 'Kintamani', 
    desc: 'Vistas del Monte Agung sin multitudes.', 
    icon: <Star size={14} />, 
    mapUrl: 'https://www.google.com/maps/place/Mount+Agung',
    x: 580,
    y: 150
  },
  { 
    name: 'Secret Holy Tree Temple', 
    loc: 'Tabanan', 
    desc: 'Un templo milenario construido alrededor de un árbol gigante sagrado.', 
    icon: <Star size={14} />, 
    mapUrl: 'https://www.google.com/maps/search/holy+tree+temple+bali',
    x: 350,
    y: 280
  }
];

export default function App() {
  const [view, setView] = useState<'chat' | 'dining' | 'experiences' | 'villas' | 'contact' | 'activities' | 'taxi' | 'itinerary' | 'map' | 'weather' | 'translator' | 'converter'>('chat');
  const [isSoundscapePlaying, setIsSoundscapePlaying] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Bienvenido. Soy Ketut, su Concierge de Élite en la Isla de los Dioses. Es un honor asistirle en la creación de una estancia que trascienda lo convencional.\n\nPara diseñar una experiencia a su medida en la Isla de los Dioses, ¿prefiere el refugio espiritual de la selva en Ubud o la sofisticación de los acantilados de Uluwatu?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isToolkitOpen, setIsToolkitOpen] = useState(true);
  const [baliTime, setBaliTime] = useState('');
  const [eurInput, setEurInput] = useState<string>('');
  const [idrOutput, setIdrOutput] = useState<string>('0');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initializingAuth, setInitializingAuth] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializingAuth(false);
      if (!currentUser) {
        setIsAuthModalOpen(true);
      } else {
        setIsAuthModalOpen(false);
        fetchReservations(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const idrVal = (parseFloat(eurInput) || 0) * 16300;
    setIdrOutput(idrVal.toLocaleString('id-ID'));
  }, [eurInput]);

  const fetchReservations = async (userId: string) => {
    try {
      const q = query(
        collection(db, 'reservations'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const resData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reservation[];
      setReservations(resData);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setBaliTime(formatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // Update every 10 seconds for precision
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (customMessage?: string) => {
    const messageToSend = typeof customMessage === 'string' ? customMessage : input.trim();
    if (!messageToSend || isLoading) return;

    if (typeof customMessage !== 'string') setInput('');
    setMessages(prev => [...prev, { role: 'user', text: messageToSend }]);
    setIsLoading(true);

    try {
      if (!chat) {
        throw new Error('API de Gemini no configurada. Por favor, agregue GEMINI_API_KEY en el archivo .env');
      }
      const response = await chat.sendMessage({ message: messageToSend });
      const responseText = response.text || '';
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);

      // Trigger AuthModal if AI mentions registration/Elite Member and user is not logged in
      const registrationKeywords = ['iniciar sesión', 'registrarse', 'miembro élite', 'acceso', 'registro'];
      if (!user && registrationKeywords.some(keyword => responseText.toLowerCase().includes(keyword))) {
        setTimeout(() => setIsAuthModalOpen(true), 1500); // Slight delay for better UX
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Mis disculpas, ha ocurrido un inconveniente técnico. Por favor, permítame intentarlo de nuevo.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const requestAction = async (type: 'restaurante' | 'experiencia' | 'villa' | 'actividad' | 'transporte', name: string, url?: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    // If it's a direct booking request with a URL, we prioritize opening the URL
    if (url) {
      window.open(url, '_blank');
    } else {
      setView('chat');
      const prompt = `Deseo solicitar información y gestionar una reserva para la ${type}: ${name}.`;
      handleSend(prompt);
    }
    
    // Auto-save reservation interest to Firestore as a lead
    try {
      await addDoc(collection(db, 'reservations'), {
        userId: user.uid,
        serviceType: type,
        serviceName: name,
        status: 'interés_web',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        details: url ? `El usuario ha sido redirigido a la web oficial: ${url}` : `Solicitud realizada vía interfaz de concierge.`
      });
      
      if (!url) {
        setMessages(prev => [...prev, { role: 'model', text: `He registrado su interés en **${name}** en nuestra base de datos prioritaria. Estoy procesando los detalles de su reserva ahora mismo.` }]);
      }
    } catch (error) {
      console.error("Error saving reservation:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (initializingAuth) {
    return (
      <div className="h-screen w-full bg-ink flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-serif text-5xl text-gold mb-4"
        >
          K
        </motion.div>
        <div className="h-px w-24 bg-gold/20 mb-4" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Iniciando Concierge Élite...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bali-bg text-ivory overflow-hidden selection:bg-gold/30">
      {/* Background Elements */}
      <div className="fixed inset-0 luxury-gradient pointer-events-none" />
      <div className="fixed inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')]" />

      {/* Header - Full Width */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-6 bg-ink/80 backdrop-blur-xl sticky top-0 z-[60]">
        <div className="flex items-center gap-6 lg:w-[20%]">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl tracking-[0.3em] text-gold uppercase select-none">Ketut</h1>
            <div className="hidden lg:block h-4 w-px bg-white/10" />
            <p className="hidden lg:block text-[9px] tracking-[0.15em] text-white/40 uppercase">Elite Concierge</p>
          </div>
        </div>
        
        <div className="hidden lg:flex flex-1 justify-center items-center gap-16 text-[11px] uppercase tracking-[0.2em] text-white/40">
          <button 
            onClick={() => setView('chat')}
            className={`hover:text-gold cursor-pointer transition-colors ${view === 'chat' ? 'text-gold' : ''} bg-transparent border-none py-1`}
          >
            Servicio
          </button>
          <button 
            onClick={() => setView('experiences')}
            className={`hover:text-gold cursor-pointer transition-colors ${view === 'experiences' ? 'text-gold' : ''} bg-transparent border-none py-1`}
          >
            Premium
          </button>
          <button 
            onClick={() => setView('activities')}
            className={`hover:text-gold cursor-pointer transition-colors ${view === 'activities' ? 'text-gold' : ''} bg-transparent border-none py-1`}
          >
            Wellness
          </button>
          <button 
            onClick={() => setView('taxi')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all ${view === 'taxi' ? 'bg-gold/20 text-gold border-gold/30' : 'hover:text-gold border-transparent'} border bg-transparent font-medium`}
          >
            <Car size={13} />
            <span>Taxi VIP</span>
          </button>
          <button 
            onClick={() => setView('dining')}
            className={`hover:text-gold cursor-pointer transition-colors ${view === 'dining' ? 'text-gold' : ''} bg-transparent border-none py-1`}
          >
            Cenas
          </button>
          <button 
            onClick={() => setView('villas')}
            className={`hover:text-gold cursor-pointer transition-colors ${view === 'villas' ? 'text-gold' : ''} bg-transparent border-none py-1`}
          >
            Villas
          </button>
        </div>

        <div className="flex items-center justify-end gap-6 lg:w-[20%]">
          <div className="hidden xl:flex flex-col items-end mr-2">
            <span className="text-[9px] text-white/30 uppercase tracking-widest font-medium">Isla de Bali</span>
            <span className="text-[11px] font-mono text-white/60">{baliTime}</span>
          </div>

          {user ? (
            <div className="flex items-center gap-4 group">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] text-gold/60 uppercase tracking-widest font-bold">Élite</span>
                <span className="text-[11px] text-white/80">{user.displayName || user.email?.split('@')[0]}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-gold text-ink text-[10px] uppercase tracking-widest font-bold px-5 py-2 rounded-full hover:bg-ivory transition-all shadow-lg"
            >
              Acceso
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar - Mobile Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* Sidebar Content */}
        <motion.aside
          initial={false}
          animate={{ x: isSidebarOpen ? 0 : -300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`fixed lg:static lg:top-0 top-0 bottom-0 left-0 w-72 bg-ink/95 border-r border-white/5 z-50 lg:translate-x-0 flex flex-col`}
        >
          {/* Sidebar interior (navigation) */}
          <nav className="flex-1 p-6 space-y-8 overflow-y-auto pt-20 lg:pt-10 scrollbar-hide">
            <div>
              <h2 className="text-[11px] uppercase tracking-[0.15em] text-gold/60 mb-4 font-semibold italic">Gestión de Estancia</h2>
              <ul className="space-y-4">
                <SidebarItem icon={<Calendar size={16} />} label="Mi Itinerario" onClick={() => { setView('itinerary'); setIsSidebarOpen(false); if(user) fetchReservations(user.uid); }} active={view === 'itinerary'} />
                <SidebarItem icon={<MapIcon size={16} />} label="Tesoros Ocultos" onClick={() => { setView('map'); setIsSidebarOpen(false); }} active={view === 'map'} />
                <SidebarItem icon={<CloudSun size={16} />} label="Clima y Mareas" onClick={() => { setView('weather'); setIsSidebarOpen(false); }} active={view === 'weather'} />
              </ul>
            </div>

            <div>
              <h2 className="text-[11px] uppercase tracking-[0.15em] text-gold/60 mb-4 font-semibold italic">Herramientas Élite</h2>
              <ul className="space-y-4">
                <SidebarItem icon={<Languages size={16} />} label="Cortesía Balinesa" onClick={() => { setView('translator'); setIsSidebarOpen(false); }} active={view === 'translator'} />
                <SidebarItem icon={<Banknote size={16} />} label="Conversor de Divisas" onClick={() => { setView('converter'); setIsSidebarOpen(false); }} active={view === 'converter'} />
              </ul>
            </div>

            <div className="pt-4 mt-4 border-t border-white/5">
              <h2 className="text-[11px] uppercase tracking-[0.15em] text-gold/60 mb-4 font-semibold italic">Catálogo Exclusive</h2>
              <ul className="space-y-4">
                <SidebarItem icon={<Compass size={16} />} label="Chat Concierge" onClick={() => { setView('chat'); setIsSidebarOpen(false); }} active={view === 'chat'} />
                <SidebarItem icon={<MapPin size={16} />} label="Villas de Ensueño" onClick={() => { setView('villas'); setIsSidebarOpen(false); }} active={view === 'villas'} />
                <SidebarItem icon={<Utensils size={16} />} label="Restauración" onClick={() => { setView('dining'); setIsSidebarOpen(false); }} active={view === 'dining'} />
                <SidebarItem icon={<ShieldCheck size={16} />} label="Experiencias" onClick={() => { setView('experiences'); setIsSidebarOpen(false); }} active={view === 'experiences'} />
                <SidebarItem icon={<ActivityIcon size={16} />} label="Actividades" onClick={() => { setView('activities'); setIsSidebarOpen(false); }} active={view === 'activities'} />
                <SidebarItem icon={<Car size={16} />} label="Taxi & VIP" onClick={() => { setView('taxi'); setIsSidebarOpen(false); }} active={view === 'taxi'} />
                <SidebarItem icon={<UserIcon size={16} />} label="Contacto" onClick={() => { setView('contact'); setIsSidebarOpen(false); }} active={view === 'contact'} />
              </ul>
            </div>
          </nav>

          <div className="p-8 border-t border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center bg-gold/5">
                <span className="font-serif text-gold">K</span>
              </div>
              <div>
                <p className="text-xs font-medium">Ketut</p>
                <p className="text-[10px] text-white/40">Leading Hotels of the World</p>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {view === 'chat' ? (
          <>
            {/* Floating Taxi Button for Mobile/Quick Access */}
            <div className="fixed bottom-24 right-6 z-50 lg:hidden">
              <button 
                onClick={() => setView('taxi')}
                className="w-14 h-14 bg-gold text-ink rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
              >
                <Car size={24} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 space-y-8 scrollbar-hide">
              <div className="max-w-6xl mx-auto w-full flex flex-col space-y-8">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-2xl ${msg.role === 'user' ? 'bg-gold/10 border border-gold/20' : 'glass-panel'} p-6 rounded-2xl`}>
                        {msg.role === 'model' && (
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold">Ketut</span>
                            <div className="h-px w-8 bg-gold/30" />
                          </div>
                        )}
                        <div className="markdown-body text-sm leading-relaxed text-white/80">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
                      <Loader2 size={16} className="animate-spin text-gold" />
                      <span className="text-[10px] uppercase tracking-widest text-white/40">Ketut está redactando...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-8 lg:p-12 pt-0 w-full flex flex-col items-center">
              <div className="relative w-full max-w-6xl mx-auto px-4 lg:px-0 mb-10">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escriba su petición aquí..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-full py-5 pl-10 pr-20 text-base focus:outline-none focus:border-gold/50 transition-all placeholder:text-white/20 shadow-2xl"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gold flex items-center justify-center text-ink hover:bg-gold/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <Send size={20} />
                </button>
              </div>

              {/* Daily Bali Insights Grid - Moved below input as per user request */}
              <div className="max-w-6xl w-full mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 lg:px-0">
                {/* 1. Calendario Sagrado */}
                <div className="glass-panel p-5 rounded-3xl border-gold/10 hover:border-gold/30 transition-all cursor-pointer group group relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                      <Moon size={40} className="text-gold" />
                   </div>
                   <p className="text-[9px] uppercase tracking-widest text-gold/60 mb-2 font-bold italic">Calendario Sagrado</p>
                   <h5 className="text-sm font-serif text-white mb-1">Luna Creciente</h5>
                   <p className="text-[10px] text-white/40 italic">Purnama en 3 días</p>
                </div>

                {/* 2. Ketut's Soundscape */}
                <div 
                  onClick={() => setIsSoundscapePlaying(!isSoundscapePlaying)}
                  className="glass-panel p-5 rounded-3xl border-gold/10 hover:border-gold/30 transition-all cursor-pointer flex flex-col justify-between group overflow-hidden relative"
                >
                   <div className={`absolute inset-0 bg-gold/5 transition-opacity duration-1000 ${isSoundscapePlaying ? 'opacity-100' : 'opacity-0'}`} />
                   <div>
                     <p className="text-[9px] uppercase tracking-widest text-gold/60 mb-2 font-bold italic">Ketut's Soundscape</p>
                     <h5 className="text-sm font-serif text-white mb-1">Selva de Ubud</h5>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="flex gap-1 items-end h-3">
                        {[1, 2, 3, 4].map(idx => (
                          <motion.div 
                            key={idx}
                            animate={isSoundscapePlaying ? { height: [4, 12, 6, 12, 4] } : { height: 4 }}
                            transition={{ duration: 1, repeat: Infinity, delay: idx * 0.1 }}
                            className="w-0.5 bg-gold"
                          />
                        ))}
                     </div>
                     <span className="text-[10px] text-white/60 font-mono tracking-tighter uppercase">{isSoundscapePlaying ? 'En directo' : 'Pausado'}</span>
                   </div>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 group-hover:text-gold/20 transition-colors">
                      {isSoundscapePlaying ? <Waves size={24} /> : <Music size={24} />}
                   </div>
                </div>

                {/* 3. Canang Sari Diario */}
                <div className="glass-panel p-5 rounded-3xl border-gold/10 hover:border-gold/30 transition-all cursor-pointer group flex flex-col justify-between">
                   <div>
                     <p className="text-[9px] uppercase tracking-widest text-gold/60 mb-2 font-bold italic">Ofrenda Diaria</p>
                     <h5 className="text-sm font-serif text-white mb-1">Canang Sari</h5>
                   </div>
                   <div className="flex items-center gap-2">
                      <motion.div 
                        whileHover={{ rotate: 45, scale: 1.2 }}
                        className="text-gold"
                      >
                        <Flower2 size={16} />
                      </motion.div>
                      <span className="text-[10px] text-white/40 italic">Bendición de Ketut</span>
                   </div>
                </div>

                {/* 4. Jet Lag Recovery */}
                <div className="glass-panel p-5 rounded-3xl border-gold/10 hover:border-gold/30 transition-all cursor-pointer group relative overflow-hidden">
                   <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                      <Sparkles size={48} className="text-gold" />
                   </div>
                   <p className="text-[9px] uppercase tracking-widest text-gold/60 mb-2 font-bold italic">Wellness Tip</p>
                   <h5 className="text-sm font-serif text-white mb-1">Jet Lag Recovery</h5>
                   <p className="text-[10px] text-white/40 italic">Masaje balinés a las 18:00</p>
                </div>
              </div>
              <p className="text-center text-[10px] text-white/20 mt-4 uppercase tracking-[0.1em]">
                Bespoke Concierge Service • Bali • Leading Hotels of the World • v2.2-Elite
              </p>

              {/* Horizontal Elite Toolkit Bar - Requested by user to be below "peticion" */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 px-4 lg:px-0"
              >
                {/* Bali Status Card */}
                <div className="glass-panel p-4 rounded-2xl border-white/5 flex items-center justify-between hover:border-gold/20 transition-all">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-gold/60" />
                    <span className="text-sm font-serif text-white">{baliTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CloudSun size={14} className="text-gold/60" />
                    <span className="text-[10px] text-white/60">29°C</span>
                  </div>
                </div>

                {/* Quick Converter Card */}
                <div className="glass-panel p-4 rounded-2xl border-gold/10 bg-gold/5 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Banknote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/40" />
                    <input 
                      type="number"
                      value={eurInput}
                      onChange={(e) => setEurInput(e.target.value)}
                      placeholder="EUR -> IDR"
                      className="w-full bg-ink/40 border border-white/10 rounded-lg py-1 pl-9 pr-2 text-[10px] font-serif text-white focus:outline-none focus:border-gold/30 placeholder:text-white/10"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-serif text-gold italic whitespace-nowrap">{idrOutput} IDR</span>
                  </div>
                </div>

                {/* Phrase Card */}
                <div 
                  className="glass-panel p-4 rounded-2xl border-white/5 cursor-pointer hover:border-gold/30 transition-all flex items-center justify-between group"
                  onClick={() => setView('translator')}
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest text-white/20 group-hover:text-gold/40">Cortesía</span>
                    <span className="text-xs font-serif text-white italic">Matur Suksma</span>
                  </div>
                  <Languages size={14} className="text-gold/60" />
                </div>

                {/* Treasure Map Card */}
                <div 
                  className="glass-panel p-4 rounded-2xl border-white/5 cursor-pointer hover:border-gold/30 transition-all flex items-center justify-between group"
                  onClick={() => setView('map')}
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest text-white/20 group-hover:text-gold/40">Tesoros</span>
                    <span className="text-xs font-serif text-white italic">Coordenadas VIP</span>
                  </div>
                  <MapIcon size={14} className="text-gold/60" />
                </div>
              </motion.div>
            </div>
          </>
        ) : view === 'itinerary' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
             <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="font-serif text-5xl text-gold mb-4 italic">Mi Itinerario de Élite</h2>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold">Línea de tiempo de sus experiencias registradas</p>
                </div>

                <div className="relative border-l border-gold/10 ml-6 space-y-12 pb-12">
                  {reservations.length === 0 ? (
                    <div className="pl-12 py-20 text-center">
                      <p className="text-white/40 italic">Aún no ha registrado reservas. Explore nuestras villas, restaurantes y experiencias para comenzar su itinerario.</p>
                    </div>
                  ) : (
                    reservations.map((res, idx) => (
                      <motion.div 
                        key={res.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative pl-12"
                      >
                        <div className="absolute left-[-5px] top-2 w-2.5 h-2.5 bg-gold rounded-full shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                        <div className="glass-panel p-8 rounded-[2rem] hover:border-gold/30 transition-all border border-white/5">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] uppercase tracking-widest text-gold font-bold">{res.serviceType}</span>
                            <span className="text-[10px] text-white/20">{res.createdAt?.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                          </div>
                          <h3 className="font-serif text-2xl text-white mb-2">{res.serviceName}</h3>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">{res.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
             </div>
          </div>
        ) : view === 'map' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
            <div className="max-w-6xl mx-auto h-full flex flex-col">
              <div className="mb-12">
                <h2 className="font-serif text-4xl text-gold mb-2">Tesoros Ocultos</h2>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40 italic">Lugares fuera del circuito comercial, seleccionados por Ketut</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                <div className="lg:col-span-2 glass-panel rounded-[3rem] relative overflow-hidden h-[600px] border border-gold/10">
                    {/* 2D Map of Bali with Technical Details */}
                    <svg viewBox="0 0 800 500" className="w-full h-full bg-ink/40">
                       <defs>
                         <filter id="islandGlow">
                           <feGaussianBlur stdDeviation="3" result="blur" />
                           <feComposite in="SourceGraphic" in2="blur" operator="over" />
                         </filter>
                         <radialGradient id="waterHighlight" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(212,175,55,0.05)" />
                            <stop offset="100%" stopColor="transparent" />
                         </radialGradient>
                       </defs>
                       
                       {/* Subtle Water Texture & Highlight */}
                       <rect width="100%" height="100%" fill="url(#waterHighlight)" />
                       <rect width="100%" height="100%" fill="rgba(212,175,55,0.02)" />

                       {/* Massive Background Label */}
                       <text x="400" y="300" textAnchor="middle" fill="gold" fontSize="180" opacity="0.02" className="font-serif select-none pointer-events-none tracking-[0.1em] font-bold">BALI</text>

                       {/* Technical Coordinate Rail */}
                       <g opacity="0.15" fill="white" fontSize="7" className="font-mono tracking-widest uppercase">
                          <text x="20" y="100" transform="rotate(-90 20,100)">08° 12' 48" S</text>
                          <text x="20" y="250" transform="rotate(-90 20,250)">08° 34' 12" S</text>
                          <text x="20" y="400" transform="rotate(-90 20,400)">08° 51' 36" S</text>
                          
                          <text x="150" y="485">114° 43' 12" E</text>
                          <text x="400" y="485">115° 12' 36" E</text>
                          <text x="650" y="485">115° 31' 48" E</text>
                       </g>

                       {/* Accurate Bali Path (Refined 2D) */}
                       <path 
                         d="M80,240 
                            C100,220 160,210 220,195 
                            C280,180 320,130 380,110 
                            C440,90 550,110 630,150 
                            C700,180 740,210 750,240 
                            C760,270 730,310 700,340 
                            C670,370 620,400 560,410 
                            C510,420 490,440 470,465 
                            C450,490 410,500 390,480 
                            C380,460 390,435 370,425 
                            C350,415 310,420 270,405 
                            C230,390 190,365 150,325 
                            C120,285 70,260 80,240 Z" 
                         fill="rgba(212,175,55,0.08)" 
                         stroke="rgba(212,175,55,0.5)" 
                         strokeWidth="2" 
                         filter="url(#islandGlow)"
                       />

                       {/* Nusa Penida & Siblings */}
                       <path 
                         d="M620,350 C630,345 650,350 660,360 C670,375 660,395 640,390 C620,385 615,360 620,350 Z" 
                         fill="rgba(212,175,55,0.06)" 
                         stroke="rgba(212,175,55,0.3)" 
                         strokeWidth="1"
                       />

                       {/* Landmark Nodes & Recommended Points */}
                       <g opacity="0.4">
                          <circle cx="380" cy="210" r="3" fill="var(--color-gold)" /> 
                          <text x="390" y="214" fill="white" fontSize="9" className="font-serif italic tracking-widest">UBUD</text>

                          <circle cx="410" cy="455" r="3" fill="var(--color-gold)" />
                          <text x="420" y="459" fill="white" fontSize="9" className="font-serif italic tracking-widest">ULUWATU</text>

                          <circle cx="280" cy="380" r="2.5" fill="white" opacity="0.5" />
                          <text x="290" y="384" fill="white" fontSize="8" className="font-serif italic tracking-widest opacity-60">CANGGU</text>

                          <circle cx="680" cy="220" r="2.5" fill="white" opacity="0.3" />
                          <text x="640" y="224" fill="white" fontSize="8" className="font-serif italic tracking-widest opacity-40">AMED</text>
                       </g>

                       {/* Recommended Treasure Markers */}
                       {HIDDEN_TREASURES.map((treasure, idx) => (
                         <motion.g 
                           key={idx}
                           initial={{ scale: 0 }}
                           animate={{ scale: 1 }}
                           transition={{ delay: idx * 0.1 }}
                           className="cursor-pointer group"
                           onClick={() => window.open(treasure.mapUrl, '_blank')}
                         >
                            <circle cx={treasure.x} cy={treasure.y} r="8" fill="rgba(212,175,55,0.15)" className="animate-pulse" />
                            <circle cx={treasure.x} cy={treasure.y} r="3.5" fill="var(--color-gold)" className="stroke-white stroke-[0.5px]" />
                            
                            <foreignObject x={treasure.x + 10} y={treasure.y - 12} width="160" height="30">
                               <div className="bg-ink/90 backdrop-blur-xl border border-gold/30 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <p className="text-[8px] text-gold font-bold font-serif whitespace-nowrap uppercase tracking-wider">{treasure.name}</p>
                               </div>
                            </foreignObject>
                         </motion.g>
                       ))}
                       
                       {/* Map Grid Lines */}
                       {[...Array(8)].map((_, i) => (
                         <line key={`v-${i}`} x1={i * 100 + 50} y1="0" x2={i * 100 + 50} y2="500" stroke="white" strokeWidth="0.5" opacity="0.03" />
                       ))}
                       {[...Array(5)].map((_, i) => (
                         <line key={`h-${i}`} x1="0" y1={i * 100 + 50} x2="800" y2={i * 100 + 50} stroke="white" strokeWidth="0.5" opacity="0.03" />
                       ))}
                    </svg>

                    <div className="absolute inset-0 p-12 flex flex-col justify-end pointer-events-none">
                       <div className="bg-ink/95 backdrop-blur-xl p-8 rounded-[2rem] border border-gold/20 max-w-sm pointer-events-auto shadow-2xl">
                         <div className="flex items-center gap-4 mb-4">
                           <div className="w-3 h-3 bg-gold rounded-full shadow-[0_0_15px_rgba(212,175,55,0.6)] animate-pulse" />
                           <h4 className="text-gold font-bold text-xs uppercase tracking-[0.4em] font-serif">Bali Elite Cartography</h4>
                         </div>
                         <p className="text-[11px] text-white/50 leading-relaxed font-serif italic mb-4">Precision-guided navigation for the most exclusive locations on the island. Updated in real-time by the Concierge network.</p>
                         <div className="flex gap-4 pt-4 border-t border-white/5">
                            <div className="flex flex-col">
                               <span className="text-[8px] uppercase tracking-widest text-white/30">Scale</span>
                               <span className="text-[10px] text-gold font-mono">1:250,000 VIP</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[8px] uppercase tracking-widest text-white/30">Projection</span>
                               <span className="text-[10px] text-gold font-mono">Elite-Mercator</span>
                            </div>
                         </div>
                       </div>
                    </div>
                </div>
                <div className="space-y-6 overflow-y-auto pr-2 scrollbar-hide h-[600px]">
                  {HIDDEN_TREASURES.map((place, i) => (
                    <div 
                      key={i} 
                      onClick={() => window.open(place.mapUrl, '_blank')}
                      className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-gold/30 transition-all cursor-pointer group"
                    >
                       <div className="flex items-center gap-2 mb-2">
                        <span className="text-gold">{place.icon}</span>
                        <h4 className="text-sm font-bold text-white group-hover:text-gold transition-colors">{place.name}</h4>
                       </div>
                       <p className="text-[10px] text-white/40 mb-3 uppercase tracking-widest">{place.loc}</p>
                       <p className="text-[10px] text-white/60 leading-relaxed">{place.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : view === 'weather' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
            <div className="max-w-4xl mx-auto">
               <div className="text-center mb-16">
                  <h2 className="font-serif text-5xl text-gold mb-4 italic">Clima y Mareas</h2>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold italic">Condiciones Celestes sobre Bali</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                   <div className="glass-panel p-10 rounded-[3rem] text-center border-gold/10">
                      <CloudSun size={64} className="text-gold mx-auto mb-6 opacity-80" />
                      <div className="text-6xl font-serif text-white mb-2">29°C</div>
                      <p className="text-gold uppercase tracking-[0.2em] text-xs font-bold mb-6">Soleado con Brisa de Índico</p>
                      <div className="flex items-center justify-around text-[10px] text-white/40 border-t border-white/5 pt-8">
                         <div className="flex flex-col gap-1">
                            <span>HUMEDAD</span>
                            <span className="text-white font-bold">78%</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span>VIENTO</span>
                            <span className="text-white font-bold">12 km/h</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span>UV INDEX</span>
                            <span className="text-white font-bold">9 (Alto)</span>
                         </div>
                      </div>
                   </div>
                   <div className="glass-panel p-10 rounded-[3rem] text-center border-gold/10">
                      <Compass size={64} className="text-gold mx-auto mb-6 opacity-80" />
                      <h3 className="text-2xl font-serif text-white mb-6 italic">Estado de las Mareas</h3>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                           <span className="text-[10px] uppercase tracking-widest text-white/40">Marea Alta</span>
                           <span className="text-gold font-bold">10:24 AM (2.4m)</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                           <span className="text-[10px] uppercase tracking-widest text-white/40">Marea Baja</span>
                           <span className="text-white/60">04:12 PM (0.6m)</span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] uppercase tracking-widest text-white/40">Surf: Padang Padang</span>
                           <span className="text-emerald-500 font-bold uppercase tracking-widest">Condiciones Élite</span>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="glass-panel p-8 rounded-[2rem] border border-gold/20 flex items-center gap-6">
                   <div className="w-12 h-12 rounded-full border border-gold/30 flex items-center justify-center text-gold">
                      <Star size={20} />
                   </div>
                   <div>
                      <p className="text-sm font-serif italic text-white">Recomendación del Concierge</p>
                      <p className="text-xs text-white/50">"Hoy es el día perfecto para sobrevolar el Monte Batur en helicóptero. La visibilidad es total."</p>
                   </div>
                </div>
            </div>
          </div>
        ) : view === 'translator' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
             <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="font-serif text-5xl text-gold mb-4 italic">Cortesía Balinesa</h2>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold">La elegancia de la palabra en la Isla de los Dioses</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {[
                      { es: 'Saluda (Bendición Celesta)', bal: 'Om Swastiastu', use: 'Al entrar en cualquier lugar' },
                      { es: 'Muchas Gracias (Desde el corazón)', bal: 'Matur Suksma', use: 'Gratitud universal' },
                      { es: 'De nada / Con gusto', bal: 'Suksma Mewali', use: 'Respuesta amable' },
                      { es: '¿Cómo estás?', bal: 'Punapi Gatra?', use: 'Interés genuino' },
                      { es: 'Que tengas un buen viaje', bal: 'Rahajeng Memargi', use: 'Al despedirse' },
                      { es: 'Perdón / Con permiso', bal: 'Ampura', use: 'Cortesía máxima' },
                   ].map((phrase, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.02 }}
                      className="glass-panel p-8 rounded-[2rem] border border-white/5 hover:border-gold/30 transition-all cursor-pointer"
                    >
                       <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2 font-bold">{phrase.es}</p>
                       <h3 className="text-3xl font-serif text-gold mb-4 italic">{phrase.bal}</h3>
                       <p className="text-xs italic text-white/50">{phrase.use}</p>
                    </motion.div>
                   ))}
                </div>

                <div className="mt-12 p-8 text-center bg-gold/5 rounded-[2rem] border border-gold/10">
                   <p className="text-xs text-white/60 leading-relaxed max-w-2xl mx-auto italic">
                     "En Bali, hablar no es solo comunicar datos, es transferir energía. Use estas palabras con una leve inclinación de cabeza y las manos unidas frente al pecho (Anjali Mudra) para una conexión total con nuestra cultura."
                   </p>
                </div>
             </div>
          </div>
        ) : view === 'converter' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
            <div className="max-w-2xl mx-auto">
               <div className="text-center mb-16">
                  <h2 className="font-serif text-5xl text-gold mb-4 italic">Conversor de Divisas Élite</h2>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold">Navegue por el valor de la Rupia con precisión</p>
                </div>

                <div className="glass-panel p-10 rounded-[3rem] border-gold/20 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-gold/5 rounded-full blur-3xl" />
                   
                   <div className="space-y-10 relative">
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-bold italic">Importe en EUR / USD</label>
                        <div className="relative">
                          <Banknote size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gold opacity-50" />
                          <input 
                            type="number" 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-16 pr-6 text-2xl font-serif text-white focus:outline-none focus:border-gold/40 transition-colors"
                            placeholder="0.00"
                            value={eurInput}
                            onChange={(e) => setEurInput(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex justify-center">
                         <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center text-ink shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}>
                              <Compass size={24} />
                            </motion.div>
                         </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-bold italic">Valor en Rupia Indonesa (IDR)</label>
                        <div className="bg-white/5 rounded-2xl p-8 border border-gold/10 text-center">
                           <span className="text-4xl lg:text-5xl font-serif text-gold italic">{idrOutput} IDR</span>
                        </div>
                      </div>
                   </div>
                   
                   <p className="mt-10 text-[9px] text-center uppercase tracking-widest text-white/20 italic">Tipo de cambio preferencial exclusivo para miembros • Actualizado cada 30 min</p>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4">
                  <div className="glass-panel p-6 rounded-2xl text-center border border-white/5">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Cena Lujo (Est.)</p>
                    <p className="text-white font-serif italic italic">1.5M IDR</p>
                  </div>
                  <div className="glass-panel p-6 rounded-2xl text-center border border-white/5">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Traslado Aeropuerto</p>
                    <p className="text-white font-serif italic italic">500k IDR</p>
                  </div>
                </div>
            </div>
          </div>
        ) : view === 'dining' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h2 className="font-serif text-4xl text-gold mb-2">Restauración de Autor</h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Una selección curada por Ketut</p>
                </div>
                <button 
                  onClick={() => setView('chat')}
                  className="text-[10px] uppercase tracking-[0.2em] text-gold border border-gold/30 px-6 py-2 rounded-full hover:bg-gold hover:text-ink transition-all"
                >
                  Regresar al Concierge
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {LUXURY_RESTAURANTS.map((rest, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel overflow-hidden rounded-3xl group cursor-pointer hover:border-gold/30 transition-all flex flex-col"
                  >
                    <div className="h-48 overflow-hidden relative" onClick={() => rest.url && window.open(rest.url, '_blank')}>
                      <img 
                        src={rest.image} 
                        alt={rest.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <div className="bg-ink/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                          <span className="text-[9px] uppercase tracking-widest text-gold font-bold">{rest.location}</span>
                        </div>
                        {rest.googleMapsUrl && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); window.open(rest.googleMapsUrl, '_blank'); }}
                            className="bg-gold/80 hover:bg-gold text-ink p-1.5 rounded-full shadow-lg transition-all"
                            title="Ver en Google Maps"
                          >
                            <MapPin size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div onClick={() => rest.url && window.open(rest.url, '_blank')}>
                        <h3 className="font-serif text-xl text-white mb-2 group-hover:text-gold transition-colors">{rest.name}</h3>
                        <p className="text-xs text-white/60 leading-relaxed mb-4 h-12 overflow-hidden line-clamp-3">
                          {rest.description}
                        </p>
                      </div>
                      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-gold/80 italic">{rest.specialty}</span>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => requestAction('restaurante', rest.name, rest.url)}
                            className="bg-gold/10 text-gold text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-full border border-gold/30 hover:bg-gold hover:text-ink transition-all"
                          >
                            Reservar
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : view === 'experiences' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h2 className="font-serif text-4xl text-gold mb-2">Experiencias Premium</h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Itinerarios espirituales y tours privados</p>
                </div>
                <button 
                  onClick={() => setView('chat')}
                  className="text-[10px] uppercase tracking-[0.2em] text-gold border border-gold/30 px-6 py-2 rounded-full hover:bg-gold hover:text-ink transition-all"
                >
                  Regresar al Concierge
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {PREMIUM_EXPERIENCES.map((exp, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel overflow-hidden rounded-[2rem] group flex flex-col lg:flex-row cursor-pointer hover:border-gold/30 transition-all"
                  >
                    <div className="lg:w-2/5 h-64 lg:h-auto overflow-hidden relative" onClick={() => exp.url && window.open(exp.url, '_blank')}>
                      <img 
                        src={exp.image} 
                        alt={exp.title} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent lg:hidden" />
                      {exp.googleMapsUrl && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); window.open(exp.googleMapsUrl, '_blank'); }}
                          className="absolute top-4 right-4 bg-gold/80 hover:bg-gold text-ink p-2 rounded-full shadow-lg transition-all z-10"
                          title="Ver en Google Maps"
                        >
                          <MapPin size={14} />
                        </button>
                      )}
                    </div>
                    <div className="lg:w-3/5 p-8 flex flex-col justify-between">
                      <div onClick={() => exp.url && window.open(exp.url, '_blank')}>
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">{exp.category}</span>
                          <div className="h-px w-12 bg-gold/20" />
                        </div>
                        <h3 className="font-serif text-2xl text-white mb-4 group-hover:text-gold transition-colors">{exp.title}</h3>
                        <p className="text-sm text-white/50 leading-relaxed mb-6">
                          {exp.description}
                        </p>
                      </div>
                      <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase tracking-widest text-white/30 mb-1">Highlight</span>
                          <span className="text-xs text-gold italic">{exp.highlight}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => requestAction('experiencia', exp.title, exp.url)}
                            className="bg-gold/10 text-gold text-[10px] uppercase tracking-widest px-8 py-3 rounded-full border border-gold/20 hover:bg-gold hover:text-ink transition-all font-bold"
                          >
                            Registrar Experiencia
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : view === 'villas' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h2 className="font-serif text-4xl text-gold mb-2">Villas de Ensueño</h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Oasis de serenidad y lujo privado</p>
                </div>
                <button 
                  onClick={() => setView('chat')}
                  className="text-[10px] uppercase tracking-[0.2em] text-gold border border-gold/30 px-6 py-2 rounded-full hover:bg-gold hover:text-ink transition-all"
                >
                  Regresar al Concierge
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {LUXURY_VILLAS.map((villa, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel overflow-hidden rounded-3xl group cursor-pointer hover:border-gold/30 transition-all flex flex-col"
                  >
                    <div className="h-64 overflow-hidden relative" onClick={() => villa.url && window.open(villa.url, '_blank')}>
                      <img 
                        src={villa.image} 
                        alt={villa.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <div className="bg-ink/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                          <span className="text-[9px] uppercase tracking-widest text-gold font-bold">{villa.location}</span>
                        </div>
                        {villa.googleMapsUrl && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); window.open(villa.googleMapsUrl, '_blank'); }}
                            className="bg-gold/80 hover:bg-gold text-ink p-1.5 rounded-full shadow-lg transition-all"
                            title="Ver en Google Maps"
                          >
                            <MapPin size={12} />
                          </button>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-ink/20 group-hover:bg-transparent transition-colors duration-500" />
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                      <div onClick={() => villa.url && window.open(villa.url, '_blank')}>
                        <h3 className="font-serif text-2xl text-white mb-3 group-hover:text-gold transition-colors">{villa.name}</h3>
                        <p className="text-sm text-white/60 leading-relaxed mb-6">
                          {villa.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-8">
                        {villa.amenities.map((amenity, j) => (
                          <span key={j} className="text-[9px] uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/40">
                            {amenity}
                          </span>
                        ))}
                      </div>
                      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-gold font-semibold">Miembro Élite</span>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => requestAction('villa', villa.name, villa.url)}
                            className="bg-gold/10 text-gold text-[10px] uppercase tracking-widest font-bold px-6 py-2.5 rounded-full border border-gold/30 hover:bg-gold hover:text-ink transition-all"
                          >
                            Registrar Reserva
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : view === 'activities' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h2 className="font-serif text-4xl text-gold mb-2">Actividades al Aire Libre</h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Bienestar, aventura y conexión con la naturaleza</p>
                </div>
                <button 
                  onClick={() => setView('chat')}
                  className="text-[10px] uppercase tracking-[0.2em] text-gold border border-gold/30 px-6 py-2 rounded-full hover:bg-gold hover:text-ink transition-all"
                >
                  Regresar al Concierge
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {OUTDOOR_ACTIVITIES.map((act, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel overflow-hidden rounded-3xl group cursor-pointer hover:border-gold/30 transition-all flex flex-col"
                  >
                    <div className="h-48 overflow-hidden relative" onClick={() => act.url && window.open(act.url, '_blank')}>
                      <img 
                        src={act.image} 
                        alt={act.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <div className="bg-ink/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                          <span className="text-[9px] uppercase tracking-widest text-gold font-bold">{act.category}</span>
                        </div>
                        {act.googleMapsUrl && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); window.open(act.googleMapsUrl, '_blank'); }}
                            className="bg-gold/80 hover:bg-gold text-ink p-1.5 rounded-full shadow-lg transition-all"
                            title="Ver en Google Maps"
                          >
                            <MapPin size={12} />
                          </button>
                        )}
                      </div>
                      <div className="absolute top-4 right-4 bg-ink/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="text-[9px] uppercase tracking-widest text-white/60">{act.location}</span>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div onClick={() => act.url && window.open(act.url, '_blank')}>
                        <h3 className="font-serif text-xl text-white mb-2 group-hover:text-gold transition-colors">{act.name}</h3>
                        <p className="text-xs text-white/60 leading-relaxed mb-4 h-12 overflow-hidden line-clamp-3">
                          {act.description}
                        </p>
                      </div>
                      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-gold/80 italic">{act.highlight}</span>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => requestAction('actividad', act.name, act.url)}
                            className="bg-gold/10 text-gold text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-full border border-gold/30 hover:bg-gold hover:text-ink transition-all"
                          >
                            Registrar
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : view === 'taxi' ? (
          <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-12 scrollbar-hide">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h2 className="font-serif text-4xl text-gold mb-2">Taxi & Transporte</h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Movilidad exclusiva por toda la isla</p>
                </div>
                <button 
                  onClick={() => setView('chat')}
                  className="text-[10px] uppercase tracking-[0.2em] text-gold border border-gold/30 px-6 py-2 rounded-full hover:bg-gold hover:text-ink transition-all"
                >
                  Regresar al Concierge
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {TRANSPORT_OPTIONS.map((opt, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel overflow-hidden rounded-3xl group cursor-pointer hover:border-gold/30 transition-all flex flex-col h-full"
                  >
                    <div className="h-48 overflow-hidden relative" onClick={() => opt.url && window.open(opt.url, '_blank')}>
                      <img 
                        src={opt.image} 
                        alt={opt.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 bg-gold text-ink text-[10px] font-bold px-3 py-1 rounded-full">
                        {opt.priceRange}
                      </div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                      <div onClick={() => opt.url && window.open(opt.url, '_blank')}>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold">{opt.type}</span>
                          <Car size={16} className="text-white/20" />
                        </div>
                        <h3 className="font-serif text-2xl text-white mb-4 group-hover:text-gold transition-colors">{opt.name}</h3>
                        <p className="text-sm text-white/60 leading-relaxed mb-8 flex-1">
                          {opt.description}
                        </p>
                      </div>
                      <div className="mt-auto pt-6 border-t border-white/5">
                        <button 
                          onClick={() => requestAction('transporte', opt.name, opt.url)}
                          className="w-full bg-gold/10 text-gold text-[10px] uppercase tracking-[0.2em] font-bold py-4 rounded-full border border-gold/30 hover:bg-gold hover:text-ink transition-all"
                        >
                          Solicitar Servicio VIP
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel max-w-2xl w-full p-12 rounded-[3rem] text-center"
            >
              <h2 className="font-serif text-4xl text-gold mb-6">Contacto Privado</h2>
              <p className="text-sm text-white/60 leading-relaxed mb-12">
                Como miembro de la red "Leading Hotels of the World", mi compromiso es con su absoluta satisfacción. 
                Para peticiones urgentes o gestiones que requieran la máxima discreción, puede contactarme directamente.
              </p>
              
              <div className="space-y-6 mb-12">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Email de Élite</span>
                  <a href="mailto:Ketut-Bali@gmail.com" className="text-lg font-serif text-white hover:text-gold transition-colors">Ketut-Bali@gmail.com</a>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Línea Directa VIP</span>
                  <span className="text-lg font-serif text-white">629906810</span>
                </div>
              </div>

              <button 
                onClick={() => setView('chat')}
                className="bg-gold text-ink text-[11px] uppercase tracking-[0.2em] px-12 py-4 rounded-full font-bold hover:bg-gold/80 transition-all"
              >
                Iniciar Conversación
              </button>
            </motion.div>
          </div>
        )}

        {/* Root UI elements */}
        {!initializingAuth && (
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)} 
            isMandatory={!user}
          />
        )}
      </main>
    </div>
  </div>
  );
}

function SidebarItem({ icon, label, onClick, active }: { icon?: React.ReactNode; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <li 
      onClick={onClick}
      className={`group flex items-center justify-between cursor-pointer ${active ? 'text-gold' : ''}`}
    >
      <div className={`flex items-center gap-3 ${active ? 'text-gold' : 'text-white/60'} group-hover:text-gold transition-colors`}>
        {icon && <span className={`${active ? 'text-gold' : 'text-gold/60'} group-hover:text-gold transition-colors`}>{icon}</span>}
        <span className="text-xs tracking-wide">{label}</span>
      </div>
      <ChevronRight size={12} className={`${active ? 'text-gold translate-x-1' : 'text-white/10'} group-hover:text-gold transition-all group-hover:translate-x-1`} />
    </li>
  );
}
