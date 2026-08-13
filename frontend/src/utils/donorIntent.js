export const DONOR_INTENTS =
    Object.freeze({
        DONATE: "donate",
        REQUEST_BLOOD:
            "request_blood",
    });

const isValidIntent = (intent) =>
    Object.values(
        DONOR_INTENTS
    ).includes(intent);

const getStorageKey = (uid) =>
    uid
        ? `donorIntent:${uid}`
        : null;

export const getDonorIntent = (
    uid
) => {
    const key =
        getStorageKey(uid);

    if (!key) {
        return null;
    }

    const sessionIntent =
        sessionStorage.getItem(key);

    if (
        isValidIntent(
            sessionIntent
        )
    ) {
        return sessionIntent;
    }

    const rememberedIntent =
        localStorage.getItem(key);

    return isValidIntent(
        rememberedIntent
    )
        ? rememberedIntent
        : null;
};

export const saveDonorIntent = ({
    uid,
    intent,
    remember = false,
}) => {
    const key =
        getStorageKey(uid);

    if (
        !key ||
        !isValidIntent(intent)
    ) {
        return false;
    }

    if (remember) {
        localStorage.setItem(
            key,
            intent
        );

        sessionStorage.removeItem(
            key
        );
    } else {
        sessionStorage.setItem(
            key,
            intent
        );

        localStorage.removeItem(
            key
        );
    }

    return true;
};

export const clearSessionDonorIntent = (
    uid
) => {
    const key =
        getStorageKey(uid);

    if (key) {
        sessionStorage.removeItem(
            key
        );
    }
};

export const getDonorIntentDestination = (
    intent
) => {
    if (
        intent ===
        DONOR_INTENTS.REQUEST_BLOOD
    ) {
        return "/dashboard?tab=seek-blood";
    }

    if (
        intent ===
        DONOR_INTENTS.DONATE
    ) {
        return "/dashboard?tab=requests";
    }

    return "/donor-intent";
};