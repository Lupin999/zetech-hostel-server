const operationsModel = require('../models/operationsModel');
const logger = require('../utils/logger');

const startPeriodScheduler = () => {
    let running = false;
    const processPeriods = async () => {
        if (running) return;
        running = true;
        try {
            await operationsModel.activateDuePeriods();
            const closed = await operationsModel.closeExpiredPeriods();
            if (closed) logger.info('HOSTEL PERIODS CLOSED', { count: closed });
        } catch (error) {
            logger.error('HOSTEL PERIOD SCHEDULER ERROR', {
                message: error.message,
                stack: error.stack,
            });
        } finally {
            running = false;
        }
    };

    void processPeriods();
    return setInterval(processPeriods, 60 * 1000);
};

module.exports = { startPeriodScheduler };
