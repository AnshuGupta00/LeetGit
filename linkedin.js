// ============================================================
// GITLEET - LINKEDIN API
// ============================================================
// Handles:
//
// 1. LinkedIn image initialization
// 2. Image upload
// 3. LinkedIn image post creation
//
// IMPORTANT:
// Image upload errors are NOT silently ignored.
// If image upload fails, the LinkedIn post fails instead of
// creating an unwanted text-only post.
// ============================================================

const LINKEDIN_VERSION = '202608';

const LINKEDIN_API_BASE =
  'https://api.linkedin.com/rest';

// ============================================================
// CUSTOM ERROR
// ============================================================

class LinkedInError extends Error {
  constructor(
    message,
    status = null,
    details = null
  ) {
    super(message);

    this.name =
      'LinkedInError';

    this.status =
      status;

    this.details =
      details;
  }
}

// ============================================================
// COMMON HEADERS
// ============================================================

function linkedinHeaders(token) {
  return {
    Authorization:
      `Bearer ${token}`,

    'LinkedIn-Version':
      LINKEDIN_VERSION,

    'X-Restli-Protocol-Version':
      '2.0.0',

    'Content-Type':
      'application/json'
  };
}

// ============================================================
// READ LINKEDIN ERROR
// ============================================================

async function getResponseError(
  response
) {
  let message =
    `HTTP ${response.status}`;

  let details =
    null;

  try {
    const data =
      await response.json();

    details = data;

    message =
      data?.message ||
      data?.detail ||
      data?.error_description ||
      data?.error ||
      message;
  } catch {
    try {
      const text =
        await response.text();

      if (text) {
        message = text;
      }
    } catch {
      // Ignore body parsing failure.
    }
  }

  return {
    message,
    details
  };
}

// ============================================================
// INITIALIZE LINKEDIN IMAGE UPLOAD
// ============================================================

async function initializeUpload(
  token,
  memberUrn
) {
  console.log(
    '[GITLEET] Initializing LinkedIn image upload...'
  );

  const response =
    await fetch(
      `${LINKEDIN_API_BASE}/images?action=initializeUpload`,
      {
        method: 'POST',

        headers:
          linkedinHeaders(token),

        body: JSON.stringify({
          initializeUploadRequest: {
            owner: memberUrn
          }
        })
      }
    );

  if (!response.ok) {
    const error =
      await getResponseError(
        response
      );

    throw new LinkedInError(
      `Image initialization failed: ${error.message}`,
      response.status,
      error.details
    );
  }

  const data =
    await response.json();

  const value =
    data?.value;

  if (
    !value?.uploadUrl ||
    !value?.image
  ) {
    console.error(
      '[GITLEET] Invalid initializeUpload response:',
      data
    );

    throw new LinkedInError(
      'LinkedIn did not return an upload URL and image URN.',
      response.status,
      data
    );
  }

  console.log(
    '[GITLEET] LinkedIn image initialized:',
    value.image
  );

  return {
    uploadUrl:
      value.uploadUrl,

    imageUrn:
      value.image
  };
}

// ============================================================
// CONVERT DATA URL TO BLOB
// ============================================================

async function dataUrlToBlob(
  dataUrl
) {
  if (
    typeof dataUrl !== 'string' ||
    !dataUrl.startsWith('data:')
  ) {
    throw new Error(
      'Invalid image data URL.'
    );
  }

  const response =
    await fetch(dataUrl);

  if (!response.ok) {
    throw new Error(
      `Could not convert image data to Blob: HTTP ${response.status}`
    );
  }

  return response.blob();
}

// ============================================================
// UPLOAD IMAGE BYTES
// ============================================================

async function uploadImage(
  uploadUrl,
  token,
  dataUrl
) {
  console.log(
    '[GITLEET] Converting code card to Blob...'
  );

  const blob =
    await dataUrlToBlob(
      dataUrl
    );

  console.log(
    '[GITLEET] Uploading image:',
    blob.type,
    blob.size,
    'bytes'
  );

  const response =
    await fetch(
      uploadUrl,
      {
        method: 'PUT',

        headers: {
          Authorization:
            `Bearer ${token}`,

          // IMPORTANT:
          // LinkedIn receives the raw image bytes.
          'Content-Type':
            blob.type ||
            'image/png'
        },

        body: blob
      }
    );

  if (!response.ok) {
    const error =
      await getResponseError(
        response
      );

    throw new LinkedInError(
      `Image upload failed: ${error.message}`,
      response.status,
      error.details
    );
  }

  console.log(
    '[GITLEET] Image upload successful.'
  );

  return true;
}

// ============================================================
// UPLOAD ONE IMAGE
// ============================================================

async function uploadLinkedInImage(
  token,
  memberUrn,
  dataUrl
) {
  const {
    uploadUrl,
    imageUrn
  } =
    await initializeUpload(
      token,
      memberUrn
    );

  await uploadImage(
    uploadUrl,
    token,
    dataUrl
  );

  return imageUrn;
}

// ============================================================
// CREATE LINKEDIN POST
// ============================================================

async function createPost(
  token,
  memberUrn,
  text,
  imageUrns,
  altText
) {
  const body = {
    author: memberUrn,

    commentary: text,

    visibility: 'PUBLIC',

    distribution: {
      feedDistribution:
        'MAIN_FEED',

      targetEntities: [],

      thirdPartyDistributionChannels: []
    },

    lifecycleState:
      'PUBLISHED',

    isReshareDisabledByAuthor:
      false
  };

  // ----------------------------------------------------------
  // SINGLE IMAGE
  // ----------------------------------------------------------

  if (imageUrns.length === 1) {
    body.content = {
      media: {
        id:
          imageUrns[0],

        altText:
          altText ||
          'LeetCode solution'
      }
    };
  }

  // ----------------------------------------------------------
  // MULTIPLE IMAGES
  // ----------------------------------------------------------

  else if (imageUrns.length > 1) {
    body.content = {
      multiImage: {
        images:
          imageUrns.map(
            (id, index) => ({
              id,

              altText:
                `${altText || 'LeetCode solution'} (${index + 1}/${imageUrns.length})`
            })
          )
      }
    };
  }

  console.log(
    '[GITLEET] Creating LinkedIn post with',
    imageUrns.length,
    'image(s)...'
  );

  const response =
    await fetch(
      `${LINKEDIN_API_BASE}/posts`,
      {
        method: 'POST',

        headers:
          linkedinHeaders(token),

        body:
          JSON.stringify(body)
      }
    );

  if (!response.ok) {
    const error =
      await getResponseError(
        response
      );

    // LinkedIn tokens commonly produce 401
    // when authorization has expired.
    if (response.status === 401) {
      throw new LinkedInError(
        'LinkedIn token expired or is invalid. Please authorize LinkedIn again.',
        401,
        error.details
      );
    }

    throw new LinkedInError(
      `LinkedIn post failed: ${error.message}`,
      response.status,
      error.details
    );
  }

  // LinkedIn commonly returns the post ID
  // in the x-restli-id header.
  const postUrn =
    response.headers.get(
      'x-restli-id'
    );

  let responseData = null;

  try {
    const text =
      await response.text();

    if (text) {
      responseData =
        JSON.parse(text);
    }
  } catch {
    // Empty/non-JSON response is okay.
  }

  console.log(
    '[GITLEET] LinkedIn post created:',
    postUrn ||
      responseData ||
      'success'
  );

  return {
    ok: true,

    urn:
      postUrn ||
      responseData?.id ||
      responseData?.urn ||
      null,

    data:
      responseData
  };
}

// ============================================================
// PUBLISH TO LINKEDIN
// ============================================================

async function publishToLinkedIn({
  token,
  memberId,
  text,
  images = [],
  altText = 'LeetCode solution'
}) {
  if (!token) {
    throw new LinkedInError(
      'LinkedIn access token is missing.'
    );
  }

  if (!memberId) {
    throw new LinkedInError(
      'LinkedIn member ID is missing.'
    );
  }

  if (
    !text ||
    !text.trim()
  ) {
    throw new LinkedInError(
      'LinkedIn post text is empty.'
    );
  }

  const memberUrn =
    `urn:li:person:${memberId}`;

  console.log(
    '[GITLEET] Publishing to LinkedIn...'
  );

  console.log(
    '[GITLEET] Member:',
    memberUrn
  );

  console.log(
    '[GITLEET] Images to upload:',
    images.length
  );

  // ----------------------------------------------------------
  // UPLOAD IMAGES
  // ----------------------------------------------------------

  const imageUrns = [];

  // LinkedIn multi-image posts support
  // up to 20 images.
  const imagesToUpload =
    images.slice(0, 20);

  for (
    let index = 0;
    index < imagesToUpload.length;
    index++
  ) {
    const dataUrl =
      imagesToUpload[index];

    try {
      console.log(
        `[GITLEET] Uploading image ${index + 1}/${imagesToUpload.length}...`
      );

      const imageUrn =
        await uploadLinkedInImage(
          token,
          memberUrn,
          dataUrl
        );

      imageUrns.push(
        imageUrn
      );

      console.log(
        `[GITLEET] Image ${index + 1} uploaded:`,
        imageUrn
      );
    } catch (error) {
      console.error(
        `[GITLEET] Image ${index + 1} upload failed:`,
        error
      );

      // IMPORTANT:
      // NEVER silently continue.
      //
      // Previously this code caught the image error and
      // continued to create a text-only LinkedIn post.
      //
      // Now the entire operation fails, so you immediately
      // know there is an image-upload problem.
      throw error;
    }
  }

  // ----------------------------------------------------------
  // SAFETY CHECK
  // ----------------------------------------------------------

  if (
    images.length > 0 &&
    imageUrns.length === 0
  ) {
    throw new LinkedInError(
      'Code images were generated, but none could be uploaded to LinkedIn. Text-only post cancelled.'
    );
  }

  // ----------------------------------------------------------
  // CREATE POST
  // ----------------------------------------------------------

  const result =
    await createPost(
      token,
      memberUrn,
      text,
      imageUrns,
      altText
    );

  return result;
}