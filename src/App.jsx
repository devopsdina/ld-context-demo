import { useState, useEffect } from 'react'
import './App.css'
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import Cookies from 'js-cookie';
import { faker } from '@faker-js/faker'
import { FaEnvelope } from 'react-icons/fa'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

function App() {
  const { releaseShinyBanner, showNewsletterSignup, enableLunchOrder, showLimitedTimeOffer } = useFlags();
  const ldClient = useLDClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(Cookies.get('user') || null);
  const [error, setError] = useState('');
  const [ldContext, setLdContext] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [displayName, setDisplayName] = useState(Cookies.get('displayName') || null);
  const [showEditLocation, setShowEditLocation] = useState(false);
  const [newLocation, setNewLocation] = useState('Remote');
  const [userLocation, setUserLocation] = useState(Cookies.get('userLocation') || 'Remote');
  const [showLunchModal, setShowLunchModal] = useState(false);
  const [isUpdatingContext, setIsUpdatingContext] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState(new Set());
  const [highlightTimeout, setHighlightTimeout] = useState(null);

  useEffect(() => {
    if (ldClient) {
      setLdContext(ldClient.getContext());
    }
  }, []);

  function capitalizeFirstLetter(string) {
    if (!string) return string;
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  const getCustomerStatus = (email) => {
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.endsWith('@launchdarkly.com')) {
      return 'employee';
    } else if (lowerEmail.endsWith('@gold.com')) {
      return 'gold';
    } else if (lowerEmail.endsWith('@silver.com')) {
      return 'silver';
    } else {
      return 'bronze';
    }
  };

  const getRandomMemberSince = () => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 10; // 10 years ago
    const randomYear = Math.floor(Math.random() * (currentYear - startYear + 1)) + startYear;
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const randomMonth = months[Math.floor(Math.random() * months.length)];
    
    return `${randomMonth} ${randomYear}`;
  };

  const generateNewAnonymousUserContext = () => {
    const existingContext = ldClient.getContext();
    if (existingContext.kind === 'multi') {
      const newAnonymousUserContext = {
        key: faker.string.uuid(),
        anonymous: true,
      };
      const updatedContext = {
        kind: 'multi',
        anonymousUser: newAnonymousUserContext,
        user: existingContext.user
      };

      ldClient.identify(updatedContext);
      setLdContext(updatedContext);
      return;
    } else if (existingContext.kind === 'anonymousUser') {
      const newAnonymousUserContext = {
        kind: 'anonymousUser',
        key: faker.string.uuid(),
        anonymous: true,
      };

      ldClient.identify(newAnonymousUserContext);
      setLdContext(newAnonymousUserContext);
    }
  };

  const handleLogin = async () => {
    if (email && password) {
      Cookies.set('user', email, { expires: 1 });
      setIsUpdatingContext(true);
      setUser(email);
      setError('');

      if (ldClient) {
        const existingContext = ldClient.getContext();
        const customerStatus = getCustomerStatus(email);
        
        const newUserContext = {
          key: email,
          name: displayName || email.split('@')[0], // Use display name if available
          email: email,
          customerStatus: customerStatus
        };

        let updatedContext;
        
        // Create Office context for LaunchDarkly users
        if (email.toLowerCase().endsWith('@launchdarkly.com')) {
          const officeContext = {
            key: faker.string.uuid(),
            location: userLocation // Using user's current location
          };
          
          updatedContext = {
            kind: 'multi',
            anonymousUser: {
              key: existingContext.key,
              anonymous: true
            },
            user: newUserContext,
            office: officeContext
          };
        } else {
          updatedContext = {
            kind: 'multi',
            anonymousUser: {
              key: existingContext.key,
              anonymous: true
            },
            user: newUserContext
          };
        }

        await ldClient.identify(updatedContext);
        setLdContext(ldClient.getContext());
        setIsUpdatingContext(false);
      }
    } else {
      setError('Please enter both email and password.');
    }
  };

  const handleLogout = async () => {
    Cookies.remove('user');
    Cookies.remove('displayName');
    setUser(null);
    setDisplayName(null);

    if (ldClient) {
      const existingContext = ldClient.getContext();
      const anonymousUserContext = existingContext.anonymousUser;
  
      const updatedContext = {
        kind: 'anonymousUser',
        ...anonymousUserContext
      };
  
      await ldClient.identify(updatedContext);
      setLdContext(ldClient.getContext());
    }
  };

  const handleEditProfile = () => {
    setNewDisplayName(displayName || user?.split('@')[0] || '');
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    
    if (!newDisplayName.trim()) {
      alert('Display name cannot be empty');
      return;
    }

    // Save the new display name
    Cookies.set('displayName', newDisplayName, { expires: 1 });
    setDisplayName(newDisplayName);
    setShowEditProfile(false);

    // Update LaunchDarkly context with new name
    if (ldClient && user) {
      const existingContext = ldClient.getContext();
      const customerStatus = getCustomerStatus(user);
      
      const updatedUserContext = {
        key: user,
        name: newDisplayName,
        email: user,
        customerStatus: customerStatus
      };

      let updatedContext;
      
      // Include Office context for LaunchDarkly users
      if (user.toLowerCase().endsWith('@launchdarkly.com')) {
        const officeContext = {
          key: faker.string.uuid(),
          location: userLocation
        };
        
        updatedContext = {
          kind: 'multi',
          anonymousUser: existingContext.anonymousUser,
          user: updatedUserContext,
          office: officeContext
        };
        
      } else {
        updatedContext = {
          kind: 'multi',
          anonymousUser: existingContext.anonymousUser,
          user: updatedUserContext
        };
      }

      await ldClient.identify(updatedContext);
      setLdContext(ldClient.getContext());
      
      // Clear any existing timeout
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
      
      // Highlight the changed field
      setHighlightedFields(new Set(['user.name']));
      
      // Remove highlighting after 3 seconds
      const timeoutId = setTimeout(() => {
        setHighlightedFields(new Set());
        setHighlightTimeout(null);
      }, 2000);
      
      setHighlightTimeout(timeoutId);
    }
  };

  const handleCancelEdit = () => {
    setShowEditProfile(false);
    setNewDisplayName('');
  };

  const handleEditLocation = () => {
    setNewLocation(userLocation);
    setShowEditLocation(true);
  };

  const handleSaveLocation = async () => {
    
    // Save the new location
    Cookies.set('userLocation', newLocation, { expires: 1 });
    setUserLocation(newLocation);
    setShowEditLocation(false);
    
    // Update LaunchDarkly context with new location
    if (ldClient && user) {
      const existingContext = ldClient.getContext();
      const customerStatus = getCustomerStatus(user);
      
      const updatedUserContext = {
        key: user,
        name: displayName || user.split('@')[0],
        email: user,
        customerStatus: customerStatus
      };

      let updatedContext;
      
      // Include Office context for LaunchDarkly users with updated location
      if (user.toLowerCase().endsWith('@launchdarkly.com')) {
        const officeContext = {
          key: faker.string.uuid(),
          location: newLocation
        };
        
        updatedContext = {
          kind: 'multi',
          anonymousUser: existingContext.anonymousUser,
          user: updatedUserContext,
          office: officeContext
        };
        
      } else {
        updatedContext = {
          kind: 'multi',
          anonymousUser: existingContext.anonymousUser,
          user: updatedUserContext
        };
      }

      // Clear any existing timeout
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
      
      setHighlightedFields(new Set(['office.location']));
      
      // Remove highlighting after 3 seconds
      const timeoutId = setTimeout(() => {
        setHighlightedFields(new Set());
        setHighlightTimeout(null);
      }, 3000);
      
      setHighlightTimeout(timeoutId);
      await ldClient.identify(updatedContext);
      setLdContext(ldClient.getContext());
    }
  };

  const handleCancelLocationEdit = () => {
    setShowEditLocation(false);
    setNewLocation(userLocation);
  };

  const formatContext = (context) => {
    const jsonString = JSON.stringify(context, null, 2);
    
    let formattedString = jsonString
      .replace(/"kind": "(\w+)"/g, '"kind": "<span class="context-kind">$1</span>"')
      .replace(/"(\w+)": {/g, '"<span class="context-attribute">$1</span>": {');
    

    if (highlightedFields.has('user.name')) {
      
      // Simple approach: find any "name" field and check if it's in a user context
      const lines = formattedString.split('\n');
      let inUserContext = false;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if we're entering user context (look for the formatted HTML)
        if (line.includes('context-attribute">user</span>": {')) {
          inUserContext = true;
          braceCount = 1; // We're inside the user object
          continue;
        }
        
        // Track braces when in user context
        if (inUserContext) {
          // Count opening braces
          const openBraces = (line.match(/{/g) || []).length;
          // Count closing braces
          const closeBraces = (line.match(/}/g) || []).length;
          
          braceCount += openBraces - closeBraces;
          
          // If we're in user context and find a name field, highlight it
          if (line.includes('"name":') && braceCount > 0) {
            const originalLine = lines[i];
            lines[i] = line.replace(
              /"name": "([^"]+)"/,
              '"name": "<span style="background-color: #fef08a !important; color: #000 !important; padding: 4px 8px; border-radius: 4px; display: inline-block; font-weight: bold; border: 2px solid #f59e0b;">$1</span>"'
            );
          }
          
          // If brace count reaches 0, we've left the user context
          if (braceCount <= 0) {
            inUserContext = false;
          }
        }
      }
      
      formattedString = lines.join('\n');
    }

    // Handle office.location highlighting
    if (highlightedFields.has('office.location')) {
      
      const lines = formattedString.split('\n');
      let inOfficeContext = false;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if we're entering office context (look for the formatted HTML)
        if (line.includes('context-attribute">office</span>": {')) {
          inOfficeContext = true;
          braceCount = 1; // We're inside the office object
          continue;
        }
        
        // Track braces when in office context
        if (inOfficeContext) {
          // Count opening braces
          const openBraces = (line.match(/{/g) || []).length;
          // Count closing braces
          const closeBraces = (line.match(/}/g) || []).length;
          
          braceCount += openBraces - closeBraces;
          
          // If we're in office context and find a location field, highlight it
          if (line.includes('"location":') && braceCount > 0) {
            const originalLine = lines[i];
            lines[i] = line.replace(
              /"location": "([^"]+)"/,
              '"location": "<span style="background-color: #fef08a !important; color: #000 !important; padding: 4px 8px; border-radius: 4px; display: inline-block; font-weight: bold; border: 2px solid #f59e0b;">$1</span>"'
            );
          }
          
          // If brace count reaches 0, we've left the office context
          if (braceCount <= 0) {
            inOfficeContext = false;
          }
        }
      }
      
      formattedString = lines.join('\n');
    }
    
    return formattedString;
  };

  const loginComponent = () => (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      <div className="p-6 w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Login Screen</h2>
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-2 p-3 border-2 border-gray-300 rounded-lg w-full text-white bg-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 p-3 border-2 border-gray-300 rounded-lg w-full text-white bg-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleLogin}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg w-full font-semibold transition-colors duration-200 border-2 border-blue-500 hover:border-blue-600"
        >
          Login
        </button>
        {error && <p className="text-red-500 mt-2 font-medium">{error}</p>}
      </div>
    </div>
  );

  const accountOverviewComponent = () => {
    const getStatusBadgeColor = (status) => {
      switch(status?.toLowerCase()) {
        case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'employee': return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
      }
    };

    return (
      <div className="w-full h-full overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-bold">
              {user?.split('@')[0]?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{displayName || user?.split('@')[0]}</h2>
              <p className="text-blue-100">{user}</p>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          {/* Status Badge */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Account Status</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeColor(ldContext?.user?.customerStatus)}`}>
                {ldContext && ldContext.user && capitalizeFirstLetter(ldContext.user.customerStatus)}{ldContext?.user?.customerStatus !== 'employee' ? ' Customer' : ''}
              </span>
            </div>
          </div>

          {/* Profile Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Display Name</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{displayName || user?.split('@')[0]}</span>
                  <button
                    onClick={handleEditProfile}
                    className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-1"
                    title="Edit display name"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Email Address</span>
                <span className="font-medium text-gray-900">{user}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium text-gray-900">{getRandomMemberSince()}</span>
              </div>
              {user?.toLowerCase().endsWith('@launchdarkly.com') && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Location</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{userLocation}</span>
                    <button
                      onClick={handleEditLocation}
                      className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-1"
                      title="Edit location"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Order Lunch Button - Conditional based on flag */}
          {enableLunchOrder && (
            <div className="pt-6">
              <button
                onClick={() => setShowLunchModal(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 border border-orange-600 hover:border-orange-700 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Order Lunch
              </button>
            </div>
          )}

          {/* Logout Button */}
          <div className="pt-8 mt-6">
            <button
              onClick={handleLogout}
              className="w-full bg-red-50 hover:bg-red-100 text-red-700 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 border border-red-200 hover:border-red-300 flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  };

  return (
    <>
      { releaseShinyBanner && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-200 p-4 text-center border border-yellow-400 mb-0 z-50 transform hover:scale-105 transition-all duration-500 text-gray-800 font-bold shadow-lg">
          <div className="animate-bounce inline-block">🌟</div>
          <span className="mx-2">Shiny banner released only to Gold customers!</span>
          <div className="animate-bounce inline-block">🌟</div>
        </div>
      ) }
      { showNewsletterSignup && user && (
        <button className={`fixed ${releaseShinyBanner ? 'top-14' : 'top-0'} mt-0 left-0 right-0 p-4 rounded-none bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 flex items-center justify-center transform hover:scale-110 transition-transform duration-300`}>
          <FaEnvelope className="mr-2" />
          Sign up for our newsletter - available to all customer traffic!
        </button>
      )}
      
      { showLimitedTimeOffer && user && !isUpdatingContext && (
        <div className={`fixed ${(releaseShinyBanner && showNewsletterSignup) ? 'top-28' : (releaseShinyBanner || showNewsletterSignup) ? 'top-14' : 'top-0'} left-0 right-0 bg-gradient-to-r from-green-400 via-green-500 to-green-400 p-4 text-center border border-green-600 z-40 transform hover:scale-105 transition-all duration-300 text-white font-bold shadow-lg`}>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">⚡</span>
            <span className="text-lg">LIMITED TIME: Get 50% OFF upgrade to Gold status!</span>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-sm mt-1 opacity-90">Exclusive offer only 50% of customers receive it- Act now!          </div>
        </div>
      )}

      {/* Lunch Coupon Modal */}
      {showLunchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center">
            <h2 className="text-2xl font-bold mb-4 text-orange-600">🍽️ Lunch Order Coupon</h2>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-gray-700 mb-3">Use this exclusive coupon code when ordering:</p>
              <div className="font-mono text-lg font-bold text-black">
                InTheOffice
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Visit <span className="font-semibold text-orange-600">fakelunch.com</span> to place your order
            </p>
            <div className="text-sm text-gray-500 mb-4">
              * Valid for in-office employees only
            </div>
            <button
              onClick={() => setShowLunchModal(false)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      
      <h1 className="text-center text-4xl font-bold my-8 text-white">LD Context Demo</h1>
      <div className="mx-2 my-4 px-4" style={{ minHeight: '720px', transform: 'scale(1.2)', transformOrigin: 'top center' }}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={50} minSize={30}>
            <div className="rounded-lg shadow-xl w-full h-full relative" style={{background: 'linear-gradient(135deg, #34d399, #06b6d4, #3b82f6)', padding: '2px'}}>
              <div className="relative bg-white rounded-lg h-full">
                { user ? accountOverviewComponent() : loginComponent()}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 hover:from-blue-300 hover:via-blue-400 hover:to-blue-300 transition-all duration-300 cursor-col-resize shadow-lg hover:shadow-xl rounded-lg mx-1" />
          
          <Panel defaultSize={50} minSize={30}>
            <div className="rounded-lg shadow-xl w-full h-full relative" style={{background: 'linear-gradient(135deg, #34d399, #06b6d4, #3b82f6)', padding: '2px'}}>
              <div className="relative bg-white p-6 rounded-lg min-h-full flex flex-col">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Custom Context</h3>
              <pre 
                key={Array.from(highlightedFields).join(',')}
                className="flex-1"
                style={{
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                  fontFamily: "'Courier New', monospace",
                  backgroundColor: '#f8f9fa',
                  color: '#2d3748',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  margin: 0,
                  fontSize: '18px',
                  lineHeight: '1.6',
                  overflowX: 'auto',
                  minHeight: 'fit-content'
                }}
                dangerouslySetInnerHTML={{ __html: formatContext(ldContext) }} 
              />
              </div>
            </div>
          </Panel>

        </PanelGroup>
      </div>
      {!user && (
        <div className="m-4 flex justify-center">
          <button 
            onClick={generateNewAnonymousUserContext} 
            className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg max-w-md w-full text-lg font-semibold shadow-lg border-2 border-green-500 hover:border-green-600 transform hover:scale-105 transition-all duration-300"
          >
            Generate New Anonymous User Context
          </button>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Edit Profile</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-white bg-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                placeholder="Enter your display name"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveProfile}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-medium transition-colors duration-200"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 p-3 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Edit Location</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Work Location
              </label>
              <div className="space-y-4">
                <label className={`flex items-center cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${
                  newLocation === 'Remote' 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}>
                  <div className="relative mr-4">
                    <input
                      type="radio"
                      name="location"
                      value="Remote"
                      checked={newLocation === 'Remote'}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                      newLocation === 'Remote'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {newLocation === 'Remote' && (
                        <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      )}
                    </div>
                  </div>
                  <span className={`font-medium text-lg transition-colors duration-200 ${
                    newLocation === 'Remote' ? 'text-blue-700' : 'text-gray-800'
                  }`}>Remote</span>
                </label>
                <label className={`flex items-center cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${
                  newLocation === 'In Office' 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}>
                  <div className="relative mr-4">
                    <input
                      type="radio"
                      name="location"
                      value="In Office"
                      checked={newLocation === 'In Office'}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                      newLocation === 'In Office'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {newLocation === 'In Office' && (
                        <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                      )}
                    </div>
                  </div>
                  <span className={`font-medium text-lg transition-colors duration-200 ${
                    newLocation === 'In Office' ? 'text-blue-700' : 'text-gray-800'
                  }`}>In Office</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveLocation}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-medium transition-colors duration-200"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelLocationEdit}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 p-3 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
