import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import Socios from './pages/Socios';
import RolesPermisos from './pages/RolesPermisos';
import MisPacientes from './pages/MisPacientes';
import Perfil from './pages/Perfil';
import ProtectedRoute from './components/ProtectedRoute';

import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ListaEspera from './pages/ListaEspera';
import MisDocumentos from './pages/MisDocumentos';
import AdminListaEspera from './pages/AdminListaEspera';
import Delegaciones from './pages/Delegaciones';
import Subvenciones from './pages/Subvenciones';
import Seguros from './pages/Seguros';
import Inventario from './pages/Inventario';
import Actividades from './pages/Actividades';
import RecursosHumanos from './pages/RecursosHumanos';
import ProfesionalesExternos from './pages/ProfesionalesExternos';
import FormularioAltaSocio from './pages/FormularioAltaSocio';
import MiPerfilSocio from './pages/MiPerfilSocio';
import Avisos from './pages/Avisos';
import Configuracion from './pages/Configuracion';
import SepaRecibosRoute from './components/SepaRecibosRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recuperar-contrasena" element={<ForgotPassword />} />

        {/* Protected Routes wrapped in MainLayout */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={
            <ProtectedRoute checkSocio={true}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Regular Modules */}
          <Route path="socios" element={<ProtectedRoute requiredModule="socios"><Socios /></ProtectedRoute>} />
          <Route path="actividades" element={<ProtectedRoute requiredModule="actividades"><Actividades /></ProtectedRoute>} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="mi-perfil" element={<MiPerfilSocio />} />

          {/* Socio-specific Modules */}
          <Route path="mis-pacientes" element={<MisPacientes />} />
          <Route path="mis-documentos" element={<MisDocumentos />} />
          <Route path="lista-espera" element={<ListaEspera />} />
          <Route path="formulario-alta" element={<FormularioAltaSocio />} />
          <Route path="avisos" element={<Avisos />} />

          {/* Admin / Config Modules */}
          <Route path="recursos-humanos" element={
            <ProtectedRoute requiredModule="recursos_humanos">
              <RecursosHumanos />
            </ProtectedRoute>
          } />
          <Route path="profesionales-externos" element={
            <ProtectedRoute requiredModule="profesionales_externos">
              <ProfesionalesExternos />
            </ProtectedRoute>
          } />
          <Route path="usuarios" element={
            <ProtectedRoute requiredModule="usuarios">
              <Usuarios />
            </ProtectedRoute>
          } />
          <Route path="roles-permisos" element={
            <ProtectedRoute requiredModule="roles_permisos">
              <RolesPermisos />
            </ProtectedRoute>
          } />
          <Route path="admin-espera" element={
            <ProtectedRoute requiredModule="lista_espera">
              <AdminListaEspera />
            </ProtectedRoute>
          } />
          <Route path="delegaciones" element={
            <ProtectedRoute requiredModule="delegaciones">
              <Delegaciones />
            </ProtectedRoute>
          } />
          <Route path="subvenciones" element={
            <ProtectedRoute requiredModule="subvenciones">
              <Subvenciones />
            </ProtectedRoute>
          } />
          <Route path="seguros" element={
            <ProtectedRoute requiredModule="seguros">
              <Seguros />
            </ProtectedRoute>
          } />
          <Route path="inventario" element={<ProtectedRoute requiredModule="inventario"><Inventario /></ProtectedRoute>} />
          <Route
            path="recibos-sepa"
            element={
              <ProtectedRoute requiredModule="sepa_recibos" allowedAppRoleNames={['admin', 'junta', 'junta_plus']}>
                <SepaRecibosRoute />
              </ProtectedRoute>
            }
          />
          <Route path="config" element={
            <ProtectedRoute requireAppRoleAdmin>
              <Configuracion />
            </ProtectedRoute>
          } />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
