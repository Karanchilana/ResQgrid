const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function (coords) {
          if (!Array.isArray(coords) || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return (
            typeof lng === 'number' &&
            typeof lat === 'number' &&
            lng >= -180 &&
            lng <= 180 &&
            lat >= -90 &&
            lat <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges (-180 to 180, -90 to 90)',
      },
    },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    coordinates: {
      type: pointSchema,
      required: false,
      default: null,
    },
  },
  { _id: false }
);

const disasterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Disaster title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Disaster description is required'],
      trim: true,
    },
    location: {
      type: locationSchema,
      required: [true, 'Location is required'],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'contained', 'resolved'],
      default: 'active',
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Alias creator to created_by for backward/forward compatibility
disasterSchema.virtual('creator').get(function () {
  return this.created_by;
});

disasterSchema.index({ 'location.coordinates': '2dsphere' }, { sparse: true });

disasterSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Disaster', disasterSchema);
