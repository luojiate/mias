import React from 'react';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

// Components
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Register from "./components/Register";
import Login from "./components/Login";
import CreateAnalysis from "./components/CreateAnalysis";
import PersonalAnalysis from "./components/PersonalAnalysis";

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar /> 
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create" element={<CreateAnalysis />} />
          <Route path="/personal" element={<PersonalAnalysis />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
