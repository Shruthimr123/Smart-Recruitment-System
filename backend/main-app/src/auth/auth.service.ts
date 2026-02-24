import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { MailerService } from 'src/mailer/mailer.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) { }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist.');
    }

    // Block inactive users
    if (user.status === 'inactive') {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact admin.',
      );
    }

    const isPasswordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid password.');
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role.name,
    };

    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        status: user.status,
      },
      token,
    };
  }


  async getCurrentUserStatus(email: string) {
    const user = await this.userRepo.findOne({ where: { email: email } });
    return user?.status;
  }


  async sendResetLink(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('Email not found');

    if (user.lastResetRequest && Date.now() - user.lastResetRequest < 5 * 60 * 1000) {
      throw new BadRequestException('You can request a new reset email after 5 minutes');
    }

    const payload = { email: user.email };
    const token = this.jwtService.sign(payload, { expiresIn: '15m' });

    user.resetToken = token;
    user.lastResetRequest = Date.now();
    await this.userRepo.save(user);

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    try {
      await this.mailerService.sendResetPasswordEmail(user.email, resetLink);
    } catch (err) {
      throw new BadRequestException('Failed to send reset link. Try again later.');
    }

    return { message: 'Reset link sent successfully' };
  }

  // Reset password
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { resetToken: token } });

    if (!user) {
      throw new UnauthorizedException({ message: 'This reset link is no longer valid' });
    }

    // Check 5-minute expiry
    const now = Date.now();
    if (!user.lastResetRequest || (now - user.lastResetRequest) > 1 * 60 * 1000) {
      throw new UnauthorizedException({ message: 'This reset link has expired' });
    }

    // Verify JWT
    try {
      this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException({ message: 'Invalid or expired token' });
    }

    // Update password
    user.hashedPassword = await bcrypt.hash(newPassword, 10);

    // Invalidate reset token
    user.resetToken = null;
    user.lastResetRequest = null;

    await this.userRepo.save(user);

    return { message: 'Password updated successfully' };
  }

}
