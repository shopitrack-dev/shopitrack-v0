import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Home } from '@/pages/Home';
import { Empresas } from '@/pages/Empresas';
import { Clientes } from '@/pages/Clientes';
import { Sectores } from '@/pages/Sectores';
import { Contacto } from '@/pages/Contacto';
import { NotFound } from '@/pages/NotFound';
import { LegalPage } from '@/pages/LegalPage';
import { cookiePolicy, privacyNotice, termsAndConditions } from '@/data/legal';
import { seoConfig } from '@/data/seo';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="empresas" element={<Empresas />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="sectores" element={<Sectores />} />
        <Route path="contacto" element={<Contacto />} />
        <Route
          path="aviso-de-privacidad"
          element={<LegalPage content={privacyNotice} seo={seoConfig.privacidad} />}
        />
        <Route
          path="cookies"
          element={<LegalPage content={cookiePolicy} seo={seoConfig.cookies} />}
        />
        <Route
          path="terminos-y-condiciones"
          element={<LegalPage content={termsAndConditions} seo={seoConfig.terminos} />}
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
