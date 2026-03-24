import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, Paper, Typography, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { askQuestion } from '../api';

export default function Assistant() {
    const [messages, setMessages] = useState([
        { role: 'model', parts: [{ text: "Hello! I am FactoryGuard AI. How can I help you with your operations today?" }] }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', parts: [{ text: input }] };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await askQuestion(newMessages);
            const aiMessage = { role: 'model', parts: [{ text: response.data.response }] };
            setMessages([...newMessages, aiMessage]);
        } catch (error) {
            const errorMessageText = error.response ? error.response.data : "A network error occurred.";
            const errorMessage = { role: 'model', parts: [{ text: `Error: ${errorMessageText}` }] };
            setMessages([...newMessages, errorMessage]);
            console.error("Failed to get response from AI:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <Typography variant="h4" gutterBottom>AI Assistant</Typography>
            <Paper elevation={3} sx={{ flexGrow: 1, p: 2, overflowY: 'auto', mb: 2, display: 'flex', flexDirection: 'column' }}>
                {messages.map((msg, index) => (
                    <Box key={index} sx={{ mb: 2, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <Paper
                            elevation={1}
                            sx={{
                                p: 1.5,
                                display: 'inline-block',
                                maxWidth: '70%',
                                backgroundColor: msg.role === 'user' ? 'primary.main' : 'background.default',
                                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                borderRadius: msg.role === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                            }}
                        >
                           <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.parts[0].text}</Typography>
                        </Paper>
                    </Box>
                ))}
                 {isLoading && <CircularProgress size={24} sx={{ alignSelf: 'center', my: 2 }} />}
                 <div ref={messagesEndRef} />
            </Paper>
            <Box sx={{ display: 'flex' }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Ask about safety compliance, sensor data, or production status..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading}
                />
                <Button variant="contained" onClick={handleSend} sx={{ ml: 1, p: '15px' }} disabled={isLoading}>
                    <SendIcon />
                </Button>
            </Box>
        </Box>
    );
}