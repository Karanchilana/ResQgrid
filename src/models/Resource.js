const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['shelter', 'hospital', 'food', 'water', 'rescue', 'food_water'],
        message: '{VALUE} is not a valid resource type (shelter, hospital, food, water, rescue)',
      },
      required: [true, 'Resource type is required'],
      index: true,
    },
    capacity: {
      type: Number,
      default: 0,
      min: [0, 'Capacity cannot be negative'],
    },
    contact: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'limited', 'unavailable'],
      default: 'available',
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates [longitude, latitude] are required'],
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
          message: 'Coordinates must be [longitude, latitude] (-180 to 180, -90 to 90)',
        },
      },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

resourceSchema.index({ location: '2dsphere' });

resourceSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Resource', resourceSchema);
