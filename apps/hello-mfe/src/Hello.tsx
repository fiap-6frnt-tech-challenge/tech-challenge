/**
 * Componente exposto via Module Federation para validar o PoC do Sprint 0.
 *
 * Versão simplificada (sem @bytebank/design-system / @bytebank/shared) porque
 * essas workspace deps ainda não existem no Sprint 0. Quando Tasks 3+4
 * mergearem em phase-2, substituir os estilos inline por componentes do DS:
 *
 *   import { Button, Badge } from '@bytebank/design-system';
 *   import { formatCurrency } from '@bytebank/shared';
 *
 * Ver docs/phase-2/sprint-0/06-poc-module-federation.md Track A A3.
 */

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  padding: '1rem',
  border: '1px solid #c2c2c2',
  borderRadius: '0.5rem',
  background: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const headingStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 600,
  margin: 0,
  color: '#000b34',
};

const bodyStyle: React.CSSProperties = {
  fontSize: '1rem',
  margin: 0,
  color: '#000b34',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#6841f2',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.5rem',
  fontWeight: 600,
  cursor: 'pointer',
  alignSelf: 'flex-start',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.25rem 0.5rem',
  background: 'rgba(31, 228, 113, 0.1)',
  color: '#0d7a3e',
  borderRadius: '0.25rem',
  fontWeight: 600,
  fontSize: '0.875rem',
};

export default function Hello() {
  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>👋 Hello from MFE (port 3001)</h2>
      <p style={bodyStyle}>
        Federado em runtime via Module Federation. Componente vive em{' '}
        <code>apps/hello-mfe/src/Hello.tsx</code> mas renderiza dentro do shell em{' '}
        <code>:3000/poc</code>.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => alert('Click event disparou do MFE para o shell ✓')}
        >
          Clique aqui
        </button>
        <span style={badgeStyle}>Depósito</span>
        <span style={{ fontWeight: 600 }}>R$ 1.500,00</span>
      </div>
    </div>
  );
}
