import { useState } from "react";
import { FaAngleDown, FaAngleRight, FaBars, FaTimes } from "react-icons/fa";
import AttractionsComponent from "./components/AttractionsComponent";
import EventDrivenDemo from "./components/EventDrivenDemo";
import GenericXMLParserComponent from "./components/GenericXMLParserComponent";
import GRPCDemo from "./components/GRPCDemo";
import LLMTripPlanner from "./components/LLMTripPlanner";
import NamedPipesDemo from "./components/NamedPipesDemo";
import PXVisualization from "./components/PXVisualization";
import XMLParserComponent from "./components/XMLParserComponent";
import "./styles.css";

interface Attraction {
  name: string;
  description: string;
  url?: string;
}

const App = () => {
  const [activeComponent, setActiveComponent] = useState("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [isDriveBeatOpen, setIsDriveBeatOpen] = useState(false);
  const [savedAttractions, setSavedAttractions] = useState<Attraction[]>([]);

  const renderComponent = () => {
    switch (activeComponent) {
      case "home":
        return <Home />;
      case "xmlParser":
        return <XMLParserComponent />;
      case "attractions":
        return (
          <AttractionsComponent
            savedAttractions={savedAttractions}
            setSavedAttractions={setSavedAttractions}
          />
        );
      case "pxVisualization":
        return <PXVisualization />;
      case "grpcDemo":
        return <GRPCDemo />;
      case "namedPipesDemo":
        return <NamedPipesDemo />;
      case "eventDrivenDemo":
        return <EventDrivenDemo />;
      case "llmTripPlanner":
        return <LLMTripPlanner savedAttractions={savedAttractions} />;
      case "genericXMLParser":
        return <GenericXMLParserComponent />;
      default:
        return <Home />;
    }
  };

  const handleMenuClick = (component: string) => {
    setActiveComponent(component);
    setIsMenuOpen(false);
    setIsModulesOpen(false);
    setIsDriveBeatOpen(false);
  };

  return (
    <div className='min-h-screen bg-gray-900 text-white font-sans'>
      <header className='bg-gray-800 shadow-md p-4 flex justify-between items-center'>
        <h1
          className='text-3xl font-bold text-teal-400 cursor-pointer'
          onClick={() => handleMenuClick("home")}>
          DriveBeat Trips
        </h1>
        <nav className='hidden md:flex items-center space-x-6'>
          <NavItem onClick={() => handleMenuClick("home")}>Home</NavItem>
          <NavDropdown title='DriveBeat'>
            <DropdownItem onClick={() => handleMenuClick("attractions")}>
              Search Attractions
            </DropdownItem>
            <DropdownItem onClick={() => handleMenuClick("llmTripPlanner")}>
              Generate Plan
            </DropdownItem>
          </NavDropdown>
          <NavDropdown title='Modules'>
            <DropdownItem onClick={() => handleMenuClick("xmlParser")}>
              XML Parser
            </DropdownItem>
            <DropdownItem onClick={() => handleMenuClick("genericXMLParser")}>
              Generic XML Parser
            </DropdownItem>
            <DropdownItem onClick={() => handleMenuClick("pxVisualization")}>
              PC-Axis Visualizer
            </DropdownItem>
            <DropdownItem onClick={() => handleMenuClick("grpcDemo")}>
              gRPC Demo
            </DropdownItem>
            <DropdownItem onClick={() => handleMenuClick("namedPipesDemo")}>
              Named Pipes Demo
            </DropdownItem>
            <DropdownItem onClick={() => handleMenuClick("eventDrivenDemo")}>
              Event-Driven Demo
            </DropdownItem>
          </NavDropdown>
        </nav>
        <div className='md:hidden'>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className='text-white focus:outline-none'>
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div className='md:hidden bg-gray-800'>
          <a
            href='#'
            className='block px-4 py-2 text-lg'
            onClick={() => handleMenuClick("home")}>
            Home
          </a>

          <div>
            <button
              onClick={() => setIsDriveBeatOpen(!isDriveBeatOpen)}
              className='w-full text-left px-4 py-2 text-lg flex justify-between items-center'>
              DriveBeat {isDriveBeatOpen ? <FaAngleDown /> : <FaAngleRight />}
            </button>
            {isDriveBeatOpen && (
              <div className='pl-4'>
                <a
                  href='#'
                  className='block px-4 py-2'
                  onClick={() => handleMenuClick("attractions")}>
                  Search Attractions
                </a>
                <a
                  href='#'
                  className='block px-4 py-2'
                  onClick={() => handleMenuClick("llmTripPlanner")}>
                  Generate Plan
                </a>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => setIsModulesOpen(!isModulesOpen)}
              className='w-full text-left px-4 py-2 text-lg flex justify-between items-center'>
              Modules {isModulesOpen ? <FaAngleDown /> : <FaAngleRight />}
            </button>
            {isModulesOpen && (
              <div className='pl-4'>
                <a
                  href='#'
                  className='block px-4 py-2'
                  onClick={() => handleMenuClick("xmlParser")}>
                  XML Parser
                </a>
                <a
                  href='#'
                  className='block px-4 py-2'
                  onClick={() => handleMenuClick("genericXMLParser")}>
                  Generic XML Parser
                </a>
                <a
                  href='#'
                  className='block px-4 py-2'
                  onClick={() => handleMenuClick("pxVisualization")}>
                  PC-Axis Visualizer
                </a>
                <a
                  href='#'
                  className='block px-4 py-2'
                  onClick={() => handleMenuClick("grpcDemo")}>
                  gRPC Demo
                </a>
                <a
                  href='#'
                  className='block px-4 py-2'
                  onClick={() => handleMenuClick("namedPipesDemo")}>
                  Named Pipes Demo
                </a>
                <a
                  href='#'
                  className='block px-4 py-2'
                  onClick={() => handleMenuClick("eventDrivenDemo")}>
                  Event-Driven Demo
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <main className='p-4 md:p-8'>{renderComponent()}</main>
    </div>
  );
};

const Home = () => (
  <div className='text-center'>
    <h2 className='text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500'>
      Welcome to DriveBeat Trips
    </h2>
    <p className='text-xl text-gray-300 mb-8'>
      Your smart companion for planning unforgettable road trips and discovering
      hidden gems.
    </p>
    <div className='grid md:grid-cols-2 gap-8 text-left'>
      <div className='bg-gray-800 p-6 rounded-lg shadow-lg'>
        <h3 className='text-2xl font-bold text-teal-400 mb-3'>
          What is DriveBeat Trips?
        </h3>
        <p className='text-gray-400'>
          DriveBeat Trips is an intelligent travel planning application that
          allows you to:
        </p>
        <ul className='list-disc list-inside mt-2 text-gray-400'>
          <li>Enter your destination, duration, and travel preferences.</li>
          <li>
            Automatically generate a daily plan with attractions, museums,
            viewpoints, and restaurants.
          </li>
          <li>Organize attractions by day based on their location.</li>
          <li>Display the optimal route on Google Maps with included stops.</li>
        </ul>
      </div>
      <div className='bg-gray-800 p-6 rounded-lg shadow-lg'>
        <h3 className='text-2xl font-bold text-teal-400 mb-3'>
          How to Get Started?
        </h3>
        <p className='text-gray-400'>
          Use the navigation menu to explore the features:
        </p>
        <ul className='list-disc list-inside mt-2 text-gray-400'>
          <li>
            <span className='font-bold'>
              DriveBeat &gt; Search Attractions:
            </span>
            Discover places of interest by scraping various sources.
          </li>
          <li>
            <span className='font-bold'>DriveBeat &gt; Generate Plan:</span>
            Let our AI craft a personalized itinerary for you based on your
            preferences.
          </li>
          <li>
            <span className='font-bold'>Modules:</span> Explore the different
            data integration technologies used in this project.
          </li>
        </ul>
      </div>
    </div>
  </div>
);

const NavItem = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className='text-lg font-medium text-gray-300 hover:text-teal-400 transition-colors'>
    {children}
  </button>
);

const NavDropdown = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      className='relative'
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}>
      <button className='text-lg font-medium text-gray-300 hover:text-teal-400 transition-colors flex items-center'>
        {title}{" "}
        <span className='ml-1'>
          <FaAngleDown />
        </span>
      </button>
      {isOpen && (
        <div className='absolute z-10 pt-2 right-0'>
          <div className='min-w-[12rem] max-w-[90vw] bg-gray-700 rounded-md shadow-lg overflow-hidden'>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className='block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-600 hover:text-teal-400'>
    {children}
  </button>
);

export default App;
