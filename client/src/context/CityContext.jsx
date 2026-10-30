import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [city, setCity] = useState(() => localStorage.getItem('imovies_city') || 'Mumbai');
  const [availableCities, setAvailableCities] = useState(['Mumbai', 'Bengaluru']);

  useEffect(() => {
    async function loadCities() {
      try {
        const res = await api.get('/public/cities');
        if (res.data.cities && res.data.cities.length > 0) {
          setAvailableCities(res.data.cities);
          setCity((prevCity) => (res.data.cities.includes(prevCity) ? prevCity : res.data.cities[0]));
        }
      } catch (err) {
        console.warn('Failed to load cities:', err.message);
      }
    }
    loadCities();
  }, []);

  const changeCity = (newCity) => {
    setCity(newCity);
    localStorage.setItem('imovies_city', newCity);
  };

  return (
    <CityContext.Provider value={{ city, changeCity, availableCities }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}
