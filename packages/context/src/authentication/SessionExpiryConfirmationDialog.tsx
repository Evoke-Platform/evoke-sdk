import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
} from '@evoke-platform/ui-components';
import { Close } from '@evoke-platform/ui-components/icons';
import { useEffect, useState } from 'react';

const styles = {
    button: {
        textTransform: 'initial',
        fontSize: '14px',
        fontWeight: 700,
        marginLeft: '10px',
    },
    dialogTitle: {
        fontWeight: 700,
        paddingTop: '35px',
        paddingBottom: '20px',
    },
    closeIcon: {
        position: 'absolute',
        right: '17px',
        top: '22px',
    },
};

type SessionExpiryConfirmationDialogProps = {
    open: boolean;
    remainingTime: number;
    onClose: () => void;
    onLogout: () => void;
    onContinue: () => void;
};

export const SessionExpiryConfirmationDialog = (props: SessionExpiryConfirmationDialogProps) => {
    const { open, remainingTime, onClose, onLogout, onContinue } = props;

    const [remaining, setRemaining] = useState<number>(0);

    useEffect(() => {
        if (remaining) {
            setTimeout(() => {
                setRemaining(remaining - 1);
            }, 900);
        }
    }, [remaining]);

    useEffect(() => {
        if (open && remainingTime) {
            setRemaining(remainingTime);
        }
    }, [open, remainingTime]);

    return (
        <Dialog
            maxWidth={'sm'}
            fullWidth
            open={open}
            aria-labelledby="session-expiry-confirmation-title"
            aria-describedby="session-expiry-confirmation-content"
            onClose={onClose}
        >
            <DialogTitle sx={styles.dialogTitle}>
                <IconButton sx={styles.closeIcon} onClick={onClose}>
                    <Close fontSize="small" />
                </IconButton>
                <Typography
                    id="session-expiry-confirmation-title"
                    variant="h4"
                    fontSize="24px"
                    fontWeight="700"
                    lineHeight="36px"
                >
                    Still working?
                </Typography>
            </DialogTitle>
            <DialogContent id="session-expiry-confirmation-content" sx={{ padding: '24px' }}>
                <Typography variant="body1">
                    Your session is about to expire. You will be logged out in <b>{remaining}</b> seconds.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Box sx={{ display: 'flex', justifyContent: 'end', alignItems: 'center', width: '100%' }}>
                    <Button
                        onClick={onLogout}
                        variant="outlined"
                        sx={{ color: '#212B36', borderColor: '#919EAB52', ...styles.button }}
                    >
                        Log Out
                    </Button>
                    <Button onClick={onContinue} color="primary" variant="contained" sx={{ ...styles.button }}>
                        Continue working
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};
