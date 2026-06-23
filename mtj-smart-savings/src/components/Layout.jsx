export default function Layout({ children }) {
  return (
    <div style={{ 
      maxWidth: '480px', 
      margin: '0 auto', 
      minHeight: '100vh', 
      background: '#F4F6F8', 
      position: 'relative',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)'
    }}>
      {children}
    </div>
  );
}