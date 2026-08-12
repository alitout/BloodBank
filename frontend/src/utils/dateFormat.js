const DD_MM_YYYY_PATTERN =
    /^(\d{2})\/(\d{2})\/(\d{4})$/;

const ISO_DATE_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2})/;

const isRealDate = (
    year,
    month,
    day
) => {
    const date = new Date(
        Date.UTC(year, month - 1, day)
    );

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

export const formatDateDDMMYYYY = (
    value
) => {
    if (!value) {
        return "";
    }

    if (
        typeof value === "string"
    ) {
        const existingDisplayMatch =
            DD_MM_YYYY_PATTERN.exec(
                value.trim()
            );

        if (existingDisplayMatch) {
            const day =
                Number(existingDisplayMatch[1]);

            const month =
                Number(existingDisplayMatch[2]);

            const year =
                Number(existingDisplayMatch[3]);

            return isRealDate(
                year,
                month,
                day
            )
                ? value.trim()
                : "";
        }

        const isoMatch =
            ISO_DATE_PATTERN.exec(value);

        if (isoMatch) {
            const year = isoMatch[1];
            const month = isoMatch[2];
            const day = isoMatch[3];

            return `${day}/${month}/${year}`;
        }
    }

    const date = new Date(value);

    if (
        Number.isNaN(date.getTime())
    ) {
        return "";
    }

    const day = String(
        date.getUTCDate()
    ).padStart(2, "0");

    const month = String(
        date.getUTCMonth() + 1
    ).padStart(2, "0");

    const year =
        date.getUTCFullYear();

    return `${day}/${month}/${year}`;
};

export const parseDDMMYYYYToISO = (
    value
) => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmedValue = value.trim();

    /*
     * Native calendar input value:
     * YYYY-MM-DD
     */
    const isoMatch =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            trimmedValue
        );

    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]);
        const day = Number(isoMatch[3]);

        return isRealDate(
            year,
            month,
            day
        )
            ? trimmedValue
            : null;
    }

    /*
     * Manually entered/displayed value:
     * DD/MM/YYYY
     */
    const displayMatch =
        /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(
            trimmedValue
        );

    if (!displayMatch) {
        return null;
    }

    const day =
        Number(displayMatch[1]);

    const month =
        Number(displayMatch[2]);

    const year =
        Number(displayMatch[3]);

    if (
        !isRealDate(
            year,
            month,
            day
        )
    ) {
        return null;
    }

    return [
        String(year).padStart(4, "0"),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
    ].join("-");
};