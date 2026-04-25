import React from 'react';
import Navbar from '../components/Navbar';
import ScrollyTelling from '../components/ScrollyTelling';
import BottomSections from '../components/BottomSections';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <ScrollyTelling />
      <BottomSections />
    </>
  );
}
