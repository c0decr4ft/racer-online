#include <algorithm>
#include <cmath>
#include <cstdint>
#include <emscripten/emscripten.h>

namespace {

struct GearStats {
  double max_speed;
  double acceleration;
  double pull_from;
};

constexpr GearStats kReverse{11.0, 1.5, 0.0};
constexpr GearStats kForward[] = {
    {0.0, 0.0, 0.0},
    {15.5, 2.2, 0.0},
    {31.0, 1.6, 7.0},
    {48.0, 1.2, 16.0},
    {66.0, 0.95, 28.0},
    {86.0, 0.75, 42.0},
};

constexpr double kBrake = 62.0;
constexpr double kDrag = 0.002;
constexpr double kRoll = 1.1;
constexpr double kEngineBrake = 0.4;
constexpr double kMaxSteer = 0.68;
constexpr double kSteerSpeed = 4.0;
constexpr double kAccelerationBase = 46.0;

// x, z, heading, speed, steer angle. One shared result keeps the JS/Wasm
// boundary to one simulation call and one fixed Float64Array view.
alignas(8) double result[5]{};

double sign(double value) {
  return value > 0.0 ? 1.0 : value < 0.0 ? -1.0 : 0.0;
}

double clamp(double value, double low, double high) {
  return std::max(low, std::min(high, value));
}

const GearStats& stats_for(int gear) {
  if (gear < 0) return kReverse;
  return kForward[std::clamp(gear, 1, 5)];
}

}  // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE
void vehicle_step(double dt,
                  double x,
                  double z,
                  double heading,
                  double speed,
                  double steer_angle,
                  int gear,
                  double power_multiplier,
                  double throttle,
                  double brake,
                  double steer) {
  const double target_steer = steer * kMaxSteer;
  steer_angle +=
      (target_steer - steer_angle) * std::min(1.0, kSteerSpeed * dt * 3.0);

  if (gear == 0) {
    if (brake > 0.0) {
      speed -= sign(speed != 0.0 ? speed : 1.0) * kBrake * brake * dt;
    }
  } else {
    const GearStats& stats = stats_for(gear);
    const bool forward = gear > 0;
    const double absolute_speed = std::abs(speed);
    const double cap = stats.max_speed * power_multiplier;

    if (throttle > 0.0 && absolute_speed < cap) {
      const bool below_band = absolute_speed < stats.pull_from;
      const double lug =
          below_band
              ? clamp(absolute_speed / std::max(1.0, stats.pull_from), 0.08, 0.35)
              : 1.0;
      const double near_limit = absolute_speed / cap;
      const double taper =
          near_limit > 0.85 ? std::max(0.55, 1.0 - (near_limit - 0.85) * 3.0) : 1.0;
      const double launch = gear == 1 && absolute_speed < 5.0 ? 1.3 : 1.0;
      const double force =
          kAccelerationBase * stats.acceleration * power_multiplier * throttle * lug * taper *
          launch;
      speed += (forward ? 1.0 : -1.0) * force * dt;
      speed = forward ? std::min(speed, cap) : std::max(speed, -cap);
    } else if (throttle == 0.0 && absolute_speed > 0.5) {
      speed -= sign(speed) * kEngineBrake * absolute_speed * dt;
    }

    if (brake > 0.0) {
      if (absolute_speed > 0.4) {
        speed -= sign(speed) * kBrake * brake * dt;
      } else {
        speed = 0.0;
      }
    }

    if (forward && speed > cap) {
      speed = std::max(cap, speed - (30.0 + (speed - cap) * 2.5) * dt);
    }
    if (!forward && speed < -stats.max_speed) {
      speed =
          std::min(-stats.max_speed,
                   speed + (30.0 + (-stats.max_speed - speed) * 2.5) * dt);
    }
  }

  const double drag = kDrag * speed * std::abs(speed);
  const double rolling = kRoll * sign(speed);
  speed -= (drag + rolling) * dt;
  if (std::abs(speed) < 0.1 && throttle == 0.0) speed = 0.0;

  const double speed_factor = clamp(0.4 + std::abs(speed) / 36.0, 0.4, 1.2);
  const double turn_rate =
      steer_angle * speed_factor * (speed >= 0.0 ? 1.0 : -1.0) * 1.9;
  heading += turn_rate * dt;
  x += std::sin(heading) * speed * dt;
  z += std::cos(heading) * speed * dt;

  result[0] = x;
  result[1] = z;
  result[2] = heading;
  result[3] = speed;
  result[4] = steer_angle;
}

EMSCRIPTEN_KEEPALIVE
std::uintptr_t vehicle_result_ptr() {
  return reinterpret_cast<std::uintptr_t>(result);
}

}  // extern "C"
