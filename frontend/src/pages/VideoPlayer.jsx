import { Card, CardContent, Typography, Box } from '@mui/material';

export default function VideoPlayer({ title, videoPath, description }) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))',
        border: '1px solid rgba(167,139,250,0.3)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: '0 12px 28px rgba(167,139,250,0.3)',
        },
      }}
    >
      {/* VIDEO */}
      <Box sx={{ width: '100%', height: 200, backgroundColor: '#000' }}>
        <video
          src={videoPath}          // ✅ DIRECT PATH
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
          onError={(e) => {
            console.error('❌ Video load error:', videoPath);
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </Box>

      {/* TEXT */}
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}
