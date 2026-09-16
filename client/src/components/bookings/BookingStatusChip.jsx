import { Chip } from '@mui/material';
import { chipColor } from '../../utils/helpers';

export default function BookingStatusChip({ status }) {
    return <Chip label={status} color={chipColor(status)} size="small" />;
}
