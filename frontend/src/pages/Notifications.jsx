import React, { useContext } from 'react';
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { NotificationContext } from '../context/NotificationContext';

export default function Notifications() {
  const { notifications } = useContext(NotificationContext);

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={3}>
        🔔 Notifications de détection
      </Typography>

      <Grid container spacing={3}>
        {notifications.map((n) => (
          <Grid item xs={12} md={6} lg={4} key={n.id}>
            <Card sx={{ borderRadius: 3, boxShadow: 4 }}>
              <CardMedia
                component="img"
                height="220"
                image={n.image}
              />
              <CardContent>
                <Typography fontWeight={700}>
                  📍 {n.zone}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip label={`🧍 ${n.count} objet(s)`} size="small" />
                  <Chip label={n.timestamp} size="small" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
