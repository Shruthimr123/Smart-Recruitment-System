import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.login(loginDto);

    return {
      statusCode: '200',
      message: 'User login successfully.',
      data: user.user,
      access_token: user.token,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('/user-status/:email')
  async getCurrentUserStatus(@Param('email') email: string) {
    const user = await this.authService.getCurrentUserStatus(email);

    return {
      statusCode: '200',
      message: 'Current user status retrieved successfully.',
      data: user,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.sendResetLink(email);
  }

  // Reset password using token
  @Post('reset-password')
  async resetPassword(
    @Body() { token, password }: { token: string; password: string },
  ) {
    return this.authService.resetPassword(token, password);
  }

  


}
