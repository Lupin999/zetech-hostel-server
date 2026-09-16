import { Box, Grid, Paper, Typography, Chip, Button } from '@mui/material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function BedSelector({ beds, bedFilter, setBedFilter, selectedBed, setSelectedBed }) {
    const filteredBeds = bedFilter === 'all' ? beds : beds.filter(b => b.position === bedFilter);

    return (
        <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {[{ val: 'all', label: '🛏️ All Beds', count: beds.length },
                  { val: 'upper', label: '⬆️ Upper', count: beds.filter(b => b.position === 'upper').length },
                  { val: 'lower', label: '⬇️ Lower', count: beds.filter(b => b.position === 'lower').length },
                ].map(f => (
                    <Button key={f.val} size="small" variant={bedFilter === f.val ? 'contained' : 'outlined'}
                        onClick={() => { setBedFilter(f.val); setSelectedBed(null); }}
                        sx={{ flex: 1, fontSize: '0.75rem', py: 0.8 }}>
                        {f.label} ({f.count})
                    </Button>
                ))}
            </Box>

            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {filteredBeds.map(bed => {
                    const taken = bed.status === 'occupied';
                    const selected = selectedBed?.id === bed.id;
                    const isUpper = bed.position === 'upper';
                    return (
                        <Grid size={{ xs: 6 }} key={bed.id}>
                            <motion.div whileHover={!taken ? { scale: 1.03 } : {}} whileTap={!taken ? { scale: 0.97 } : {}}>
                                <Paper
                                    onClick={() => {
                                        if (taken) { toast.error(`Bed ${bed.bed_number} (${bed.position}) is already taken!`); return; }
                                        setSelectedBed(bed);
                                    }}
                                    sx={{
                                        p: 2, textAlign: 'center', cursor: 'pointer',
                                        border: 2, borderRadius: 2,
                                        borderColor: selected ? '#FFD700' : taken ? '#e53935' : '#43a047',
                                        bgcolor: selected ? 'rgba(255,215,0,0.12)' : taken ? 'rgba(229,57,53,0.06)' : 'rgba(67,160,71,0.06)',
                                        boxShadow: selected ? '0 0 12px rgba(255,215,0,0.4)' : 'none',
                                        opacity: taken ? 0.6 : 1,
                                        position: 'relative', overflow: 'hidden',
                                    }}
                                >
                                    {taken && (
                                        <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
                                            <Chip label="Taken" size="small" color="error" sx={{ height: 20, fontSize: '0.65rem' }} />
                                        </Box>
                                    )}
                                    <Box sx={{ fontSize: 28, mb: 0.5 }}>{isUpper ? '🛏️⬆️' : '🛏️⬇️'}</Box>
                                    <Typography variant="body1" fontWeight={700}>Bed {bed.bed_number}</Typography>
                                    <Chip
                                        label={isUpper ? 'Upper Bed' : 'Lower Bed'}
                                        size="small" variant="outlined"
                                        sx={{ mt: 0.5, textTransform: 'capitalize',
                                            borderColor: isUpper ? '#1565c0' : '#2e7d32',
                                            color: isUpper ? '#1565c0' : '#2e7d32',
                                        }}
                                    />
                                    {selected && <Typography variant="caption" display="block" sx={{ color: '#FFD700', fontWeight: 700, mt: 0.5 }}>✓ Selected</Typography>}
                                </Paper>
                            </motion.div>
                        </Grid>
                    );
                })}
                {!filteredBeds.length && (
                    <Grid size={{ xs: 12 }}>
                        <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                            No {bedFilter !== 'all' ? bedFilter : ''} beds available
                        </Typography>
                    </Grid>
                )}
            </Grid>
        </>
    );
}
